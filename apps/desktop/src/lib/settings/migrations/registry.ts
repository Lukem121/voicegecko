/**
 * Type-Safe Migration Registry
 *
 * This file registers all migrations in order and provides utilities
 * to determine which migrations need to run for a given version upgrade.
 */

import { migrationV0ToV1 } from './migrations/001-v0-to-v1';
import { migrationV1ToV2 } from './migrations/002-v1-to-v2';
import type { AnyMigration, Migration, VersionedSettings } from './types';

// =============================================================================
// TYPE-SAFE MIGRATIONS REGISTRY
// =============================================================================

/**
 * Registry of all type-safe migrations in chronological order
 * Each migration is fully type-checked at compile time
 */
export const TYPE_SAFE_MIGRATIONS: AnyMigration[] = [
  migrationV0ToV1,
  migrationV1ToV2,
];

/**
 * Get type-safe migrations needed to upgrade from one version to another
 */
export function getTypeSafeMigrationsToRun(
  fromVersion: number,
  toVersion: number
): AnyMigration[] {
  return TYPE_SAFE_MIGRATIONS.filter(
    (m) => m.version > fromVersion && m.version <= toVersion
  );
}

// =============================================================================
// LEGACY MIGRATIONS REGISTRY (for backwards compatibility)
// =============================================================================

/**
 * Legacy migration registry
 * @deprecated Use TYPE_SAFE_MIGRATIONS instead
 */
export const MIGRATIONS: Migration[] = [
  // Convert type-safe migrations to legacy format for compatibility
  ...TYPE_SAFE_MIGRATIONS.map((migration) => ({
    version: migration.version,
    description: migration.description,
    up: migration.up as unknown as (
      settings: VersionedSettings
    ) => VersionedSettings,
    down: migration.down as unknown as
      | ((settings: VersionedSettings) => VersionedSettings)
      | undefined,
  })),
];

/**
 * Get legacy migrations needed to upgrade from one version to another
 * @deprecated Use getTypeSafeMigrationsToRun instead
 */
export function getMigrationsToRun(
  fromVersion: number,
  toVersion: number
): Migration[] {
  return MIGRATIONS.filter(
    (m) => m.version > fromVersion && m.version <= toVersion
  );
}

// =============================================================================
// CURRENT VERSION AND VALIDATION
// =============================================================================

// Current settings version - this should match the highest version in migrations
export const CURRENT_SETTINGS_VERSION = 1;

/**
 * Validate that the current version matches the latest migration
 * This helps catch configuration errors during development
 */
export function validateCurrentVersion(): boolean {
  if (TYPE_SAFE_MIGRATIONS.length === 0) {
    return CURRENT_SETTINGS_VERSION === 1;
  }

  const latestMigrationVersion = Math.max(
    ...TYPE_SAFE_MIGRATIONS.map((m) => m.version)
  );

  return CURRENT_SETTINGS_VERSION === latestMigrationVersion;
}

/**
 * Get the version that would result from running all migrations
 */
export function getLatestAvailableVersion(): number {
  if (TYPE_SAFE_MIGRATIONS.length === 0) {
    return 1;
  }

  return Math.max(...TYPE_SAFE_MIGRATIONS.map((m) => m.version));
}
