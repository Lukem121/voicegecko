import {
  register,
  unregister,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { LazyStore } from "@tauri-apps/plugin-store";

import type { ShortcutCategory } from "./types";
import { shortcutActions } from "./actions";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUTS_SETTINGS_FILE,
  SHORTCUTS_STORE_KEY,
} from "./constants";
import { acceleratorFromKeys } from "./utils";

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
          // Skip push-to-talk as it requires special keydown/keyup handling
          if (shortcut.id === "push-to-talk") {
            console.log(
              `Skipping global registration for push-to-talk (handled by custom hook)`,
            );
            continue;
          }

          const accelerator = acceleratorFromKeys(shortcut.keys);
          try {
            await register(accelerator, () => {
              const action =
                shortcutActions[shortcut.id as keyof typeof shortcutActions];
              if (typeof action === "function") {
                void action();
              }
            });
            console.log(
              `Successfully registered shortcut: ${accelerator} for ${shortcut.id}`,
            );
          } catch (error) {
            console.error(
              `Failed to register shortcut ${accelerator} for ${shortcut.id}:`,
              error,
            );
            // Continue registering other shortcuts even if one fails
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
}

export const shortcutManager = ShortcutManager.getInstance();
