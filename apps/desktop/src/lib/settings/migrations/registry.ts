/**
 * Type-Safe Migration Registry
 *
 * This file registers all migrations in order and provides utilities
 * to determine which migrations need to run for a given version upgrade.
 */

import { migrationV1ToV2 } from './migrations/001-v1-to-v2';
import { migrationV2ToV3 } from './migrations/002-v2-to-v3';
import { migrationV3ToV4 } from './migrations/003-v3-to-v4';
import type { AnyMigration } from './types';

// =============================================================================
// TYPE-SAFE MIGRATIONS REGISTRY
// =============================================================================

/**
 * Registry of all type-safe migrations in chronological order
 * Each migration is fully type-checked at compile time
 */
export const TYPE_SAFE_MIGRATIONS: AnyMigration[] = [
  migrationV1ToV2,
  migrationV2ToV3,
  migrationV3ToV4,
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
// CURRENT VERSION AND VALIDATION
// =============================================================================

// Current settings version - now V2 for testing
export const CURRENT_SETTINGS_VERSION = 4;

/**
 * Validate that the current version matches the latest migration
 * This helps catch configuration errors during development
 */
export function validateCurrentVersion(): boolean {
  const latestMigrationVersion = Math.max(
    ...TYPE_SAFE_MIGRATIONS.map((m) => m.version)
  );

  return CURRENT_SETTINGS_VERSION === latestMigrationVersion;
}
