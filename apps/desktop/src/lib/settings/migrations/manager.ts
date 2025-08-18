/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: lazy */
/** biome-ignore-all lint/suspicious/noExplicitAny: lazy */

import { log } from '@acme/observability/log';
import { LazyStore } from '@tauri-apps/plugin-store';
import { analytics } from '~/lib/analytics/posthog-analytics';
import {
  CURRENT_SETTINGS_VERSION,
  getTypeSafeMigrationsToRun,
  validateCurrentVersion,
} from './registry';
import type {
  AnyMigration,
  MigrationResult,
  MigrationStepResult,
  VersionedSettings,
} from './types';
import type { AnyVersionedSettings } from './versioned-schemas';
import { isValidVersion } from './versioned-schemas';

export class SettingsMigrationManager {
  private static instance: SettingsMigrationManager;

  private constructor() {}

  static getInstance(): SettingsMigrationManager {
    SettingsMigrationManager.instance ??= new SettingsMigrationManager();
    return SettingsMigrationManager.instance;
  }

  /**
   * Type-safe settings migration with full validation
   * Supports both legacy and new type-safe migration systems
   */
  async migrateSettings(): Promise<MigrationResult> {
    const store = new LazyStore('settings.json');

    try {
      // Validate current version configuration
      if (!validateCurrentVersion()) {
        const error = new Error(
          `Configuration error: CURRENT_SETTINGS_VERSION (${CURRENT_SETTINGS_VERSION}) doesn't match latest migration version`
        );
        log.error('[Migration]', error.message);
        return {
          success: false,
          fromVersion: 0,
          toVersion: CURRENT_SETTINGS_VERSION,
          error,
        };
      }

      // Load settings
      const entries = await store.entries();
      const settings: VersionedSettings = Object.fromEntries(
        entries
      ) as VersionedSettings;

      // Initialize _meta if it doesn't exist (new users)
      if (!settings._meta) {
        const installationTimestamp = Date.now();
        settings._meta = {
          version: CURRENT_SETTINGS_VERSION,
          timestamp: installationTimestamp,
        };

        // Track app installation for new users
        try {
          analytics.track('app_installed', {
            installation_timestamp: installationTimestamp,
            first_run: true,
          });

          log.info(
            '[Migration] 🎉 New installation detected! Tracked app_installed event'
          );
        } catch (error) {
          log.warn('[Migration] Failed to track installation event:', error);
          // Don't fail the migration if analytics tracking fails
        }

        // Save the updated settings with version info
        await store.set('_meta', settings._meta);
        await store.save();

        log.info(
          `[Migration] Added versioning metadata (v${CURRENT_SETTINGS_VERSION})`
        );

        return {
          success: true,
          fromVersion: CURRENT_SETTINGS_VERSION,
          toVersion: CURRENT_SETTINGS_VERSION,
          details: {
            migrationsRun: 0,
            settingsChanged: ['_meta'],
          },
        };
      }

      const currentVersion = settings._meta.version;

      // Validate version number
      if (!isValidVersion(currentVersion)) {
        throw new Error(`Invalid settings version: ${currentVersion}`);
      }

      // Check if migration is needed
      if (currentVersion >= CURRENT_SETTINGS_VERSION) {
        log.info(
          `[Migration] Settings already up to date (v${currentVersion})`
        );
        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: currentVersion,
          details: {
            migrationsRun: 0,
            settingsChanged: [],
          },
        };
      }

      // Get type-safe migrations to run
      const migrations = getTypeSafeMigrationsToRun(
        currentVersion,
        CURRENT_SETTINGS_VERSION
      );

      if (migrations.length > 0) {
        log.info(
          `[Migration] Running ${migrations.length} type-safe migrations...`
        );

        const migrationResults: MigrationStepResult[] = [];
        const settingsChanged: string[] = [];

        // Run migrations with type safety and validation
        let migratedSettings = settings as AnyVersionedSettings;

        for (const migration of migrations) {
          const stepStartVersion = migratedSettings._meta.version;

          try {
            log.info(
              `[Migration] Applying: ${migration.description} (v${stepStartVersion} → v${migration.version})`
            );

            // Apply the migration with runtime type checking
            const beforeMigration = JSON.stringify(migratedSettings);
            migratedSettings = migration.up(
              migratedSettings as unknown as any
            ) as AnyVersionedSettings;
            const afterMigration = JSON.stringify(migratedSettings);

            // Track what changed
            if (beforeMigration !== afterMigration) {
              settingsChanged.push(
                `v${stepStartVersion}_to_v${migration.version}`
              );
            }

            // Validate migration result if validation function exists
            if (
              migration.validate &&
              !migration.validate(migratedSettings as unknown as any)
            ) {
              throw new Error(
                `Migration validation failed for v${stepStartVersion} → v${migration.version}`
              );
            }

            // Validate version was updated correctly
            if (migratedSettings._meta.version !== migration.version) {
              throw new Error(
                `Migration failed to update version correctly: expected v${migration.version}, got v${migratedSettings._meta.version}`
              );
            }

            migrationResults.push({
              fromVersion: stepStartVersion,
              toVersion: migration.version,
              success: true,
              description: migration.description,
            });

            log.info(
              `[Migration] ✅ Successfully migrated v${stepStartVersion} → v${migration.version}`
            );
          } catch (stepError) {
            const error = stepError as Error;
            log.error(
              `[Migration] ❌ Failed migration v${stepStartVersion} → v${migration.version}:`,
              error
            );

            migrationResults.push({
              fromVersion: stepStartVersion,
              toVersion: migration.version,
              success: false,
              error,
              description: migration.description,
            });

            throw new Error(
              `Migration step failed (v${stepStartVersion} → v${migration.version}): ${error.message}`
            );
          }
        }

        // Final validation - ensure we ended up at the target version
        if (migratedSettings._meta.version !== CURRENT_SETTINGS_VERSION) {
          throw new Error(
            `Migration chain failed: expected final version v${CURRENT_SETTINGS_VERSION}, got v${migratedSettings._meta.version}`
          );
        }

        // Save migrated settings
        await store.clear();
        for (const [key, value] of Object.entries(migratedSettings)) {
          await store.set(key, value);
        }
        await store.save();

        log.info(
          `[Migration] 🎉 Successfully completed all migrations! v${currentVersion} → v${CURRENT_SETTINGS_VERSION}`
        );

        // Track migration completion
        try {
          analytics.track('settings_changed', {
            category: 'general',
            setting_key: 'version',
            old_value: currentVersion,
            new_value: CURRENT_SETTINGS_VERSION,
          });
        } catch (analyticsError) {
          log.warn(
            '[Migration] Failed to track migration completion:',
            analyticsError
          );
        }

        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: CURRENT_SETTINGS_VERSION,
          details: {
            migrationsRun: migrations.length,
            settingsChanged,
          },
        };
      }

      // No migrations needed
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: CURRENT_SETTINGS_VERSION,
        details: {
          migrationsRun: 0,
          settingsChanged: [],
        },
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

  /**
   * Get current settings version from disk
   */
  async getCurrentVersion(): Promise<number | null> {
    try {
      const store = new LazyStore('settings.json');
      const meta = await store.get<{ version: number }>('_meta');
      return meta?.version ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Development helper: Reset settings to a specific version
   * WARNING: This will delete all settings! Only use in development.
   */
  async resetToVersion(targetVersion: number): Promise<void> {
    if (!isValidVersion(targetVersion)) {
      throw new Error(`Invalid version: ${targetVersion}`);
    }

    const store = new LazyStore('settings.json');
    await store.clear();

    await store.set('_meta', {
      version: targetVersion,
      timestamp: Date.now(),
    });

    await store.save();

    log.warn(`[Migration] 🔥 DEVELOPMENT: Reset settings to v${targetVersion}`);
  }

  /**
   * Development helper: Get migration preview without applying
   */
  async previewMigrations(fromVersion?: number): Promise<{
    fromVersion: number;
    toVersion: number;
    migrationsToRun: AnyMigration[];
    steps: string[];
  }> {
    const store = new LazyStore('settings.json');

    let startVersion = fromVersion;
    if (startVersion === undefined) {
      const meta = await store.get<{ version: number }>('_meta');
      startVersion = meta?.version ?? CURRENT_SETTINGS_VERSION;
    }

    const migrations = getTypeSafeMigrationsToRun(
      startVersion,
      CURRENT_SETTINGS_VERSION
    );

    return {
      fromVersion: startVersion,
      toVersion: CURRENT_SETTINGS_VERSION,
      migrationsToRun: migrations,
      steps: migrations.map(
        (m) => `v${startVersion} → v${m.version}: ${m.description}`
      ),
    };
  }
}

export const migrationManager = SettingsMigrationManager.getInstance();
