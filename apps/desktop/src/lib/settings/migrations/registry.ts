import type { Migration } from "./types";

// Registry of all migrations in order
export const MIGRATIONS: Migration<any, any>[] = [
  // Future migrations will be added here
];

// Current settings version
export const CURRENT_SETTINGS_VERSION = 1;

// Get migrations needed to upgrade from one version to another
export function getMigrationsToRun(
  fromVersion: number,
  toVersion: number,
): Migration<any, any>[] {
  return MIGRATIONS.filter(
    (m) => m.version > fromVersion && m.version <= toVersion,
  );
}
