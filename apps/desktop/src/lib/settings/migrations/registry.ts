import type { Migration } from "./types";
// Import all migrations
import { migration_0_to_1 } from "./migrations/000-initial-version";
import { migration_1_to_2 } from "./migrations/001-add-versioning";
import { migration_2_to_3 } from "./migrations/002-audio-settings-restructure";

// Registry of all migrations in order
export const MIGRATIONS: Migration[] = [
  migration_0_to_1,
  migration_1_to_2,
  migration_2_to_3,
  // Future migrations will be added here
];

// Current settings version
export const CURRENT_SETTINGS_VERSION = 3;

// Get migrations needed to upgrade from one version to another
export function getMigrationsToRun(
  fromVersion: number,
  toVersion: number,
): Migration[] {
  return MIGRATIONS.filter(
    (m) => m.version > fromVersion && m.version <= toVersion,
  );
}

// Get migrations needed to downgrade (if supported)
export function getRollbackMigrations(
  fromVersion: number,
  toVersion: number,
): Migration[] {
  return MIGRATIONS.filter(
    (m) => m.version <= fromVersion && m.version > toVersion && m.down,
  ).reverse();
}
