import type { ShortcutCategory } from "~/lib/shortcuts/types";
import { migrationManager } from "~/lib/settings/migrations/manager";
import { shortcutManager } from "~/lib/shortcuts/manager";
import { useShortcutStore } from "~/lib/stores/shortcut-store";
import { useSettingsStore } from "./settings.store";

export interface StoreInitializer {
  name: string;
  initialize: () => Promise<void>;
  priority: number; // Lower = earlier initialization
}

class StoreRegistry {
  private static instance: StoreRegistry;
  private stores: StoreInitializer[] = [];
  private initialized = false;

  private constructor() {}

  static getInstance(): StoreRegistry {
    StoreRegistry.instance ??= new StoreRegistry();
    return StoreRegistry.instance;
  }

  register(store: StoreInitializer): void {
    this.stores.push(store);
    // Sort by priority
    this.stores.sort((a, b) => a.priority - b.priority);
  }

  async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.warn("[StoreRegistry] Already initialized, skipping...");
      return;
    }

    console.log("[StoreRegistry] Initializing all stores...");

    // Run migrations first
    console.log("[StoreRegistry] Running settings migration...");
    try {
      const migrationResult = await migrationManager.migrateSettings();

      if (migrationResult.success) {
        if (migrationResult.fromVersion !== migrationResult.toVersion) {
          console.log(
            `[StoreRegistry] ✅ Migrated settings from v${migrationResult.fromVersion} to v${migrationResult.toVersion}`,
          );
        } else {
          console.log(
            `[StoreRegistry] ✅ Settings already up to date (v${migrationResult.fromVersion})`,
          );
        }
      } else {
        console.error(
          "[StoreRegistry] ❌ Failed to migrate settings:",
          migrationResult.error,
        );
        // You might want to handle migration failures differently
        // For now, we'll continue with initialization
      }
    } catch (error) {
      console.error("[StoreRegistry] Migration failed:", error);
      // Decide if you want to fail fast or continue
      // throw error;
    }

    // Then initialize stores
    for (const store of this.stores) {
      try {
        console.log(`[StoreRegistry] Initializing ${store.name}...`);
        await store.initialize();
        console.log(`[StoreRegistry] ✅ ${store.name} initialized`);
      } catch (error) {
        console.error(
          `[StoreRegistry] ❌ Failed to initialize ${store.name}:`,
          error,
        );
        throw error; // Fail fast on store initialization errors
      }
    }

    this.initialized = true;
    console.log("[StoreRegistry] ✅ All stores initialized");
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const storeRegistry = StoreRegistry.getInstance();

// Register stores with their initialization logic
storeRegistry.register({
  name: "Settings Store",
  priority: 1, // Initialize first
  initialize: async () => {
    await useSettingsStore.getState().initialize();
  },
});

storeRegistry.register({
  name: "Shortcuts",
  priority: 2, // Initialize after settings
  initialize: async () => {
    // Load shortcuts from disk into the store
    const store = shortcutManager.getStore();
    const savedShortcuts = await store.get<ShortcutCategory[]>("shortcuts");
    if (savedShortcuts) {
      useShortcutStore.getState().setShortcuts(savedShortcuts);
    }
    // Then initialize the shortcut manager to register global shortcuts
    await shortcutManager.initialize();
  },
});
