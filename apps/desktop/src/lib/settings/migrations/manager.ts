import { LazyStore } from "@tauri-apps/plugin-store";

import type { MigrationResult, VersionedSettings } from "./types";
import { CURRENT_SETTINGS_VERSION, getMigrationsToRun } from "./registry";

export class SettingsMigrationManager {
  private static instance: SettingsMigrationManager;

  private constructor() {}

  static getInstance(): SettingsMigrationManager {
    SettingsMigrationManager.instance ??= new SettingsMigrationManager();
    return SettingsMigrationManager.instance;
  }

  /**
   * Create a backup of current settings in a separate store
   */
  private async backupSettings(
    storeName: string,
    settings: any,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupStoreName = `${storeName}-backup-${timestamp}.json`;
    const backupStore = new LazyStore(backupStoreName);

    // Write all settings to backup store
    for (const [key, value] of Object.entries(settings)) {
      await backupStore.set(key, value);
    }
    await backupStore.save();

    console.log(`[Migration] Backed up settings to: ${backupStoreName}`);
    return backupStoreName;
  }

  /**
   * Migrate settings from a store
   */
  async migrateStore(
    store: LazyStore,
    storeName: string,
  ): Promise<MigrationResult> {
    try {
      // Load all settings
      const entries = await store.entries();
      const settings: any = Object.fromEntries(entries);

      // Determine current version
      const currentVersion = settings._meta?.version || 1;

      // Check if migration is needed
      if (currentVersion >= CURRENT_SETTINGS_VERSION) {
        console.log(
          `[Migration] ${storeName} is already at version ${currentVersion}`,
        );
        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: currentVersion,
        };
      }

      // Create backup before migration
      await this.backupSettings(storeName, settings);

      // Get migrations to run
      const migrations = getMigrationsToRun(
        currentVersion,
        CURRENT_SETTINGS_VERSION,
      );

      console.log(
        `[Migration] Running ${migrations.length} migrations for ${storeName}`,
      );

      // Run migrations
      let migratedSettings = settings;
      for (const migration of migrations) {
        console.log(
          `[Migration] Running migration ${migration.version}: ${migration.description}`,
        );
        migratedSettings = migration.up(migratedSettings);
      }

      // Clear the store and write migrated settings
      await store.clear();

      // Write each key-value pair
      for (const [key, value] of Object.entries(migratedSettings)) {
        await store.set(key, value);
      }

      await store.save();

      console.log(
        `[Migration] Successfully migrated ${storeName} from v${currentVersion} to v${CURRENT_SETTINGS_VERSION}`,
      );

      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: CURRENT_SETTINGS_VERSION,
        backedUp: true,
      };
    } catch (error) {
      console.error(`[Migration] Failed to migrate ${storeName}:`, error);
      return {
        success: false,
        fromVersion: 0,
        toVersion: CURRENT_SETTINGS_VERSION,
        error: error as Error,
      };
    }
  }

  /**
   * Check if a store needs migration
   */
  async needsMigration(store: LazyStore): Promise<boolean> {
    try {
      const meta = await store.get<{ version: number }>("_meta");
      const version = meta?.version || 1;
      return version < CURRENT_SETTINGS_VERSION;
    } catch {
      // If we can't read the version, assume migration is needed
      return true;
    }
  }

  /**
   * Migrate all stores
   */
  async migrateAllStores(): Promise<Map<string, MigrationResult>> {
    const results = new Map<string, MigrationResult>();

    // List of stores to migrate
    const stores = [
      { store: new LazyStore("settings.json"), name: "settings" },
      {
        store: new LazyStore("general-settings.json"),
        name: "general-settings",
      },
      { store: new LazyStore("shortcuts.json"), name: "shortcuts" },
    ];

    for (const { store, name } of stores) {
      if (await this.needsMigration(store)) {
        const result = await this.migrateStore(store, name);
        results.set(name, result);
      }
    }

    return results;
  }

  /**
   * Get backup store names (Note: This is limited by what Tauri provides)
   */
  async getBackupStoreNames(): Promise<string[]> {
    // Tauri doesn't provide a way to list stores, so we'd need to track them
    // separately or use a naming convention with timestamps
    console.warn(
      "[Migration] Listing backups not implemented - would need separate tracking",
    );
    return [];
  }

  /**
   * Restore settings from a backup store
   */
  async restoreFromBackup(
    backupStoreName: string,
    targetStoreName: string,
  ): Promise<void> {
    try {
      const backupStore = new LazyStore(backupStoreName);
      const targetStore = new LazyStore(`${targetStoreName}.json`);

      // Load all entries from backup
      const entries = await backupStore.entries();

      // Clear target and restore
      await targetStore.clear();

      for (const [key, value] of entries) {
        await targetStore.set(key, value);
      }

      await targetStore.save();
      console.log(
        `[Migration] Restored ${targetStoreName} from backup: ${backupStoreName}`,
      );
    } catch (error) {
      console.error(`[Migration] Failed to restore from backup:`, error);
      throw error;
    }
  }
}

export const migrationManager = SettingsMigrationManager.getInstance();
