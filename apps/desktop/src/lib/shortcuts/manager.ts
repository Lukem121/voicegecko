import type { ShortcutEvent } from "@tauri-apps/plugin-global-shortcut";
import {
  register,
  unregister,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { LazyStore } from "@tauri-apps/plugin-store";

import type { ShortcutCategory } from "./types";
import { recordingService } from "~/services/recording.service";
import { shortcutActions } from "./actions";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUTS_SETTINGS_FILE,
  SHORTCUTS_STORE_KEY,
} from "./constants";
import { acceleratorFromKeys, normalizeKeys } from "./utils";

class ShortcutManager {
  private static instance: ShortcutManager | undefined;
  private store: LazyStore;
  private initialized = false;

  private constructor() {
    this.store = new LazyStore(SHORTCUTS_SETTINGS_FILE);
  }

  public getStore() {
    return this.store;
  }

  public static getInstance(): ShortcutManager {
    ShortcutManager.instance ??= new ShortcutManager();
    return ShortcutManager.instance;
  }

  async initialize() {
    if (this.initialized) {
      console.log("ShortcutManager already initialized, skipping...");
      return;
    }

    this.initialized = true;
    console.log("Initializing ShortcutManager...");
    await this.loadAndRegisterShortcuts();
    // Here we could listen for changes in the store from other windows/instances
  }

  async loadAndRegisterShortcuts() {
    const categories =
      (await this.store.get<ShortcutCategory[]>(SHORTCUTS_STORE_KEY)) ??
      DEFAULT_SHORTCUTS;
    await this.registerAllShortcuts(categories);
  }

  async registerAllShortcuts(categories: ShortcutCategory[]) {
    try {
      await unregisterAll();
    } catch (error) {
      console.warn("Failed to unregister all shortcuts:", error);
    }

    for (const category of categories) {
      for (const shortcut of category.shortcuts) {
        if (shortcut.enabled && shortcut.keys.length > 0) {
          const normalizedKeys = normalizeKeys(shortcut.keys);
          const accelerator = acceleratorFromKeys(normalizedKeys);
          try {
            if (shortcut.id === "push-to-talk") {
              await register(accelerator, (event: ShortcutEvent) => {
                if (event.state === "Pressed") {
                  void this.handlePushToTalkDown();
                } else if (event.state === "Released") {
                  void this.handlePushToTalkUp();
                }
              });
              console.log(
                `Successfully registered push-to-talk: ${accelerator}`,
              );
            } else if (shortcut.id in shortcutActions) {
              await register(accelerator, () => {
                const action =
                  shortcutActions[shortcut.id as keyof typeof shortcutActions];
                if (action) {
                  void action();
                }
              });
              console.log(
                `Successfully registered shortcut: ${accelerator} for ${shortcut.id}`,
              );
            }
          } catch (error) {
            console.error(
              `Failed to register shortcut ${accelerator} for ${shortcut.id}:`,
              error,
            );
          }
        }
      }
    }
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
      await recordingService.startPushToTalk();
    } catch (error) {
      console.error("Failed to start push-to-talk recording:", error);
    }
  }

  private async handlePushToTalkUp() {
    try {
      await recordingService.stopPushToTalk();
    } catch (error) {
      console.error("Failed to stop push-to-talk recording:", error);
    }
  }
}

export const shortcutManager = ShortcutManager.getInstance();
