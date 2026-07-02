import { log } from '@acme/observability/log';
import type { ShortcutEvent } from '@tauri-apps/plugin-global-shortcut';
import {
  register,
  unregister,
  unregisterAll,
} from '@tauri-apps/plugin-global-shortcut';

import { LazyStore } from '@tauri-apps/plugin-store';
import { recordingService } from '~/services/recording.service';
import { useShortcutStore } from '../stores/shortcut-store';
import { shortcutActions } from './actions';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUTS_SETTINGS_FILE,
  SHORTCUTS_STORE_KEY,
} from './constants';
import type { Shortcut, ShortcutCategory } from './types';
import { acceleratorFromKeys, normalizeKeys } from './utils';
import { sendGeckoBarNotification } from '~/lib/gecko-bar-notifications';

class ShortcutManager {
  private static instance: ShortcutManager | undefined;
  private readonly store: LazyStore;
  private initialized = false;

  // Push-to-talk usage heuristics for usability hints
  private static readonly PTT_TAP_MAX_HOLD_MS = 250; // Max duration (ms) to count as a quick tap (unsuccessful)
  private static readonly PTT_LEARN_HOLD_MS = 600; // Considered a successful hold
  private static readonly PTT_STREAK_THRESHOLD = 2; // Show hint on the second unsuccessful attempt

  private pttPressStartTimeMs: number | null = null;
  private pttQuickTapStreak = 0;

  private isFlowStreamActive = false;

  private constructor() {
    this.store = new LazyStore(SHORTCUTS_SETTINGS_FILE);
  }

  getStore() {
    return this.store;
  }

  static getInstance(): ShortcutManager {
    ShortcutManager.instance ??= new ShortcutManager();
    return ShortcutManager.instance;
  }

  async initialize() {
    if (this.initialized) {
      log.info('ShortcutManager already initialized, skipping...');
      return;
    }

    this.initialized = true;
    log.info('Initializing ShortcutManager...');
    await this.loadAndRegisterShortcuts();
    // Here we could listen for changes in the store from other windows/instances
  }

  async loadAndRegisterShortcuts() {
    const categories =
      (await this.store.get<ShortcutCategory[]>(SHORTCUTS_STORE_KEY)) ??
      DEFAULT_SHORTCUTS;
    await this.registerAllShortcuts(categories);
  }

  // Helper function to register a single shortcut
  private async registerSingleShortcut(
    shortcut: Shortcut,
    accelerator: string
  ): Promise<void> {
    // Clear any previous error for this id before attempting registration
    useShortcutStore.getState().setRegistrationError(shortcut.id, null);

    if (shortcut.id === 'push-to-talk') {
      await register(accelerator, (event: ShortcutEvent) => {
        log.info(`[Shortcuts] Event for push-to-talk: state=${event.state}`);
        if (event.state === 'Pressed') {
          this.handlePushToTalkDown();
        } else if (event.state === 'Released') {
          this.handlePushToTalkUp();
        }
      });
      log.info(`Successfully registered push-to-talk: ${accelerator}`);
    } else if (shortcut.id === 'flow-stream') {
      await register(accelerator, (event: ShortcutEvent) => {
        log.info(`[Shortcuts] Event for flow-stream: state=${event.state}`);
        if (event.state === 'Pressed') {
          this.handleFlowStreamDown();
        } else if (event.state === 'Released') {
          this.handleFlowStreamUp();
        }
      });
      log.info(`Successfully registered flow-stream: ${accelerator}`);
    } else if (shortcut.id in shortcutActions) {
      // Standard shortcuts: separate handlers to keep complexity low
      if (shortcut.id === 'paste-last-dictation') {
        await register(accelerator, (event?: ShortcutEvent) => {
          log.info(
            `[Shortcuts] Event for ${shortcut.id}: state=${event?.state ?? 'unknown'} accel=${accelerator}`
          );
          if (!event || event.state !== 'Released') {
            return;
          }
          const action =
            shortcutActions[shortcut.id as keyof typeof shortcutActions];
          if (action) {
            log.info(`[Shortcuts] Invoking action for ${shortcut.id}`);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            Promise.resolve(action());
          }
        });
      } else {
        await register(accelerator, (event?: ShortcutEvent) => {
          log.info(
            `[Shortcuts] Event for ${shortcut.id}: state=${event?.state ?? 'unknown'} accel=${accelerator}`
          );
          if (event && event.state !== 'Pressed') {
            return;
          }
          const action =
            shortcutActions[shortcut.id as keyof typeof shortcutActions];
          if (action) {
            log.info(`[Shortcuts] Invoking action for ${shortcut.id}`);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            Promise.resolve(action());
          }
        });
      }
      log.info(
        `Successfully registered shortcut: ${accelerator} for ${shortcut.id}`
      );
    }
  }

  async registerAllShortcuts(categories: ShortcutCategory[]) {
    try {
      await unregisterAll();
    } catch (error) {
      log.warn(error, 'Failed to unregister all shortcuts:');
    }

    // Clear existing errors before re-registering
    useShortcutStore.getState().clearAllRegistrationErrors();

    const enabledShortcuts: Array<{ shortcut: Shortcut; accelerator: string }> =
      [];

    for (const category of categories) {
      for (const shortcut of category.shortcuts) {
        if (!shortcut.enabled || shortcut.keys.length === 0) {
          continue;
        }
        const normalizedKeys = normalizeKeys(shortcut.keys);
        const accelerator = acceleratorFromKeys(normalizedKeys);
        log.info(
          `[Shortcuts] Preparing to register ${shortcut.id} keys=${JSON.stringify(normalizedKeys)} accel=${accelerator}`
        );
        enabledShortcuts.push({ shortcut, accelerator });
      }
    }

    log.info(`[Shortcuts] Registering ${enabledShortcuts.length} shortcuts...`);
    for (const { shortcut, accelerator } of enabledShortcuts) {
      try {
        await this.registerSingleShortcut(shortcut, accelerator);
      } catch (error) {
        log.error(
          error,
          `[Shortcuts] Failed to register shortcut ${accelerator} for ${shortcut.id}:`
        );
        const message =
          error instanceof Error ? error.message : 'Registration failed';
        useShortcutStore.getState().setRegistrationError(shortcut.id, message);
      }
    }
    log.info('[Shortcuts] Finished registering shortcuts.');
  }

  async updateAndSaveShortcuts(categories: ShortcutCategory[]) {
    await this.store.set(SHORTCUTS_STORE_KEY, categories);
    await this.store.save();
    await this.registerAllShortcuts(categories);
  }

  async unregisterAll() {
    await unregisterAll();
  }

  async unregister(accelerator: string) {
    await unregister(accelerator);
  }

  private async handlePushToTalkDown() {
    try {
      // Track press start time to measure hold duration
      this.pttPressStartTimeMs = Date.now();
      log.info(
        '[PTT] Key down - start time recorded:',
        this.pttPressStartTimeMs
      );
      await recordingService.startPushToTalk({
        isKeyboardShortcut: true,
        mode: 'ptt_batch',
      });
    } catch (error) {
      log.error(error, 'Failed to start push-to-talk recording:');
    }
  }

  private async handlePushToTalkUp() {
    try {
      const now = Date.now();
      const holdDurationMs =
        this.pttPressStartTimeMs !== null
          ? now - this.pttPressStartTimeMs
          : Number.POSITIVE_INFINITY;
      // Reset press start immediately to avoid stale values
      this.pttPressStartTimeMs = null;

      log.info('[PTT] Key up - hold duration (ms):', holdDurationMs);

      await recordingService.stopPushToTalk();

      // Heuristic: count consecutive quick taps (unsuccessful attempts)
      const isQuickTap = Number.isFinite(holdDurationMs) && holdDurationMs <= ShortcutManager.PTT_TAP_MAX_HOLD_MS;
      log.info('[PTT] Is quick tap?', isQuickTap);
      if (isQuickTap) {
        this.pttQuickTapStreak += 1;
        log.info('[PTT] Quick tap streak:', this.pttQuickTapStreak);
        if (this.pttQuickTapStreak >= ShortcutManager.PTT_STREAK_THRESHOLD) {
          // Show hint starting on the second unsuccessful attempt, every time thereafter
          log.info('[PTT] Showing hint due to quick tap streak >= threshold');
          void sendGeckoBarNotification({
            message: 'Push and hold to dictate',
            duration: 3000,
            priority: 'high',
          });
        }
      } else {
        // Longer hold - not a quick tap; reset quick-tap detection state
        log.info('[PTT] Successful hold. Resetting quick tap streak.');
        this.pttQuickTapStreak = 0;
      }
    } catch (error) {
      log.error(error, 'Failed to stop push-to-talk recording:');
    }
  }

  private async handleFlowStreamDown() {
    try {
      if (this.isFlowStreamActive) {
        return;
      }
      this.isFlowStreamActive = true;
      await recordingService.startPushToTalk({
        isKeyboardShortcut: true,
        mode: 'flow_stream',
      });
    } catch (error) {
      log.error(error, 'Failed to start flow stream recording:');
    }
  }

  private async handleFlowStreamUp() {
    try {
      if (!this.isFlowStreamActive) {
        return;
      }
      this.isFlowStreamActive = false;
      await recordingService.stopPushToTalk({
        isKeyboardShortcut: true,
        mode: 'flow_stream',
      });
    } catch (error) {
      log.error(error, 'Failed to stop flow stream recording:');
    }
  }
}

export const shortcutManager = ShortcutManager.getInstance();
