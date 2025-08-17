import { log } from '@acme/observability/log';
import { LazyStore } from '@tauri-apps/plugin-store';
import { CURRENT_SETTINGS_VERSION, getMigrationsToRun } from './registry';
import type { MigrationResult, VersionedSettings } from './types';

export class SettingsMigrationManager {
  private static instance: SettingsMigrationManager;

  private constructor() {}

  static getInstance(): SettingsMigrationManager {
    SettingsMigrationManager.instance ??= new SettingsMigrationManager();
    return SettingsMigrationManager.instance;
  }

  /**
   * Ensure settings have proper versioning metadata
   * Since we're at version 1 with no migrations, this just adds _meta if missing
   */
  async migrateSettings(): Promise<MigrationResult> {
    const store = new LazyStore('settings.json');

    try {
      // Load settings
      const entries = await store.entries();
      const settings: VersionedSettings = Object.fromEntries(
        entries
      ) as VersionedSettings;

      // Initialize _meta if it doesn't exist (new users)
      if (!settings._meta) {
        settings._meta = {
          version: CURRENT_SETTINGS_VERSION,
          timestamp: Date.now(),
        };

        // Save the updated settings with version info
        await store.set('_meta', settings._meta);
        await store.save();

        log.info(
          `[Migration] Added versioning metadata (v${CURRENT_SETTINGS_VERSION})`
        );
      }

      const currentVersion = settings._meta.version;

      // Check if migration is needed
      if (currentVersion >= CURRENT_SETTINGS_VERSION) {
        log.info(
          `[Migration] Settings already up to date (v${currentVersion})`
        );
        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: currentVersion,
        };
      }

      // Get migrations to run (should be empty at version 1)
      const migrations = getMigrationsToRun(
        currentVersion,
        CURRENT_SETTINGS_VERSION
      );

      if (migrations.length > 0) {
        log.info(`[Migration] Running ${migrations.length} migrations...`);

        // Run migrations
        let migratedSettings = settings;
        for (const migration of migrations) {
          log.info(`[Migration] Applying: ${migration.description}`);
          migratedSettings = migration.up(migratedSettings);
        }

        // Validate migration result
        if (
          !migratedSettings._meta ||
          migratedSettings._meta.version !== CURRENT_SETTINGS_VERSION
        ) {
          throw new Error('Migration failed to update version correctly');
        }

        // Save migrated settings
        await store.clear();
        for (const [key, value] of Object.entries(migratedSettings)) {
          await store.set(key, value);
        }
        await store.save();

        log.info(
          `[Migration] Successfully migrated to v${CURRENT_SETTINGS_VERSION}`
        );

        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: CURRENT_SETTINGS_VERSION,
        };
      }

      // No migrations needed
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: CURRENT_SETTINGS_VERSION,
      };
    } catch (error) {
      log.error('[Migration] Migration failed:', error);
      return {
        success: false,
        fromVersion: 0,
        toVersion: CURRENT_SETTINGS_VERSION,
        error: error as Error,
      };
    }
  }

  /**
   * Check if settings need migration
   */
  async needsMigration(): Promise<boolean> {
    try {
      const store = new LazyStore('settings.json');
      const meta = await store.get<{ version: number }>('_meta');
      const version = meta?.version ?? 1;
      return version < CURRENT_SETTINGS_VERSION;
    } catch {
      return true; // If we can't read version, assume migration needed
    }
  }
}

export const migrationManager = SettingsMigrationManager.getInstance();
