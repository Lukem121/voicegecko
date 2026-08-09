import { log } from '@acme/observability/log';
import { migrationManager } from '~/lib/settings/migrations/manager';
import { shortcutManager } from '~/lib/shortcuts/manager';
import type { ShortcutCategory } from '~/lib/shortcuts/types';
import { useShortcutStore } from '~/lib/stores/shortcut-store';
import { isGeckoBarWindow } from '~/lib/window-detection';
import { subscribeToSessionChanges, useAuthStore } from './auth.store';
import { useConnectivityStore } from './connectivity.store';
import { useSettingsStore } from './settings.store';

export type StoreInitializer = {
  name: string;
  initialize: () => Promise<void>;
  priority: number; // Lower = earlier initialization
};

class StoreRegistry {
  private static instance: StoreRegistry;
  private readonly stores: StoreInitializer[] = [];
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
      log.warn('[StoreRegistry] Already initialized, skipping...');
      return;
    }

    log.info('[StoreRegistry] Initializing all stores...');

    // Run migrations first
    log.info('[StoreRegistry] Running settings migration...');
    try {
      const migrationResult = await migrationManager.migrateSettings();

      if (migrationResult.success) {
        if (migrationResult.fromVersion !== migrationResult.toVersion) {
          log.info(
            `[StoreRegistry] ✅ Migrated settings from v${migrationResult.fromVersion} to v${migrationResult.toVersion}`
          );
        } else {
          log.info(
            `[StoreRegistry] ✅ Settings already up to date (v${migrationResult.fromVersion})`
          );
        }
      } else {
        log.error(
          '[StoreRegistry] ❌ Failed to migrate settings:',
          migrationResult.error
        );
        // You might want to handle migration failures differently
        // For now, we'll continue with initialization
      }
    } catch (error) {
      log.error(error, '[StoreRegistry] Migration failed:');
      // Decide if you want to fail fast or continue
      // throw error;
    }

    // Then initialize stores
    for (const store of this.stores) {
      try {
        log.info(`[StoreRegistry] Initializing ${store.name}...`);
        await store.initialize();
        log.info(`[StoreRegistry] ✅ ${store.name} initialized`);
      } catch (error) {
        log.error(
          error,
          `[StoreRegistry] ❌ Failed to initialize ${store.name}:`
        );
        throw error; // Fail fast on store initialization errors
      }
    }

    this.initialized = true;
    log.info('[StoreRegistry] ✅ All stores initialized');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const storeRegistry = StoreRegistry.getInstance();

// Register stores with their initialization logic
storeRegistry.register({
  name: 'Settings Store',
  priority: 1, // Initialize first
  initialize: async () => {
    await useSettingsStore.getState().initialize();
  },
});

storeRegistry.register({
  name: 'Auth Store',
  priority: 2, // Initialize after settings, before connectivity
  initialize: async () => {
    await useAuthStore.getState().initialize();
    // Subscribe to TanStack Query session changes
    subscribeToSessionChanges();
  },
});

storeRegistry.register({
  name: 'Connectivity Store',
  priority: 3, // Initialize after auth, before shortcuts
  initialize: async () => {
    await Promise.resolve();
    // Activate connectivity monitoring for dictation blocking
    log.info('[ConnectivityStore] Activating connectivity monitoring...');
    useConnectivityStore.getState().activateMonitoring();
  },
});

storeRegistry.register({
  name: 'Shortcuts',
  priority: 4, // Initialize after connectivity
  initialize: async () => {
    // Load shortcuts from disk into the store (for UI display)
    const store = shortcutManager.getStore();
    const savedShortcuts = await store.get<ShortcutCategory[]>('shortcuts');
    if (savedShortcuts) {
      useShortcutStore.getState().setShortcuts(savedShortcuts);
    }

    // Only the main window should register global shortcuts.
    // The gecko bar window should NOT register to avoid duplicate bindings
    // which can prevent updated shortcuts from taking effect until restart.
    const isGeckoBar = isGeckoBarWindow();
    if (!isGeckoBar) {
      await shortcutManager.initialize();
    }
  },
});
