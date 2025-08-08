import { log } from '@acme/observability';
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

class ShortcutManager {
  private static instance: ShortcutManager | undefined;
  private store: LazyStore;
  private initialized = false;

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
    } else if (shortcut.id in shortcutActions) {
      // Standard shortcuts: separate handlers to keep complexity low
      if (shortcut.id === 'paste-last-transcription') {
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
      log.warn('Failed to unregister all shortcuts:', error);
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
        // biome-ignore lint/nursery/noAwaitInLoop: Sequential registration prevents shortcut conflicts
        await this.registerSingleShortcut(shortcut, accelerator);
      } catch (error) {
        log.error(
          `Failed to register shortcut ${accelerator} for ${shortcut.id}:`,
          error
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
      await recordingService.startPushToTalk({ isKeyboardShortcut: true });
    } catch (error) {
      log.error('Failed to start push-to-talk recording:', error);
    }
  }

  private async handlePushToTalkUp() {
    try {
      await recordingService.stopPushToTalk();
    } catch (error) {
      log.error('Failed to stop push-to-talk recording:', error);
    }
  }
}

export const shortcutManager = ShortcutManager.getInstance();
