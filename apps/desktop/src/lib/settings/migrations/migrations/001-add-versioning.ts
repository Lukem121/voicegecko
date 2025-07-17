import type { Migration } from "../types";

/**
 * Migration 1 -> 2: Add versioning metadata to settings
 * This migration adds the _meta field to existing settings files
 */
export const migration_1_to_2: Migration = {
  version: 2,
  description: "Add versioning metadata to settings",

  up: (settings: any) => {
    // If settings already have _meta, skip
    if (settings._meta) {
      return settings;
    }

    // Add metadata to existing settings
    return {
      _meta: {
        version: 2,
        timestamp: Date.now(),
        appVersion: "1.0.0", // You might want to get this from package.json
      },
      ...settings,
    };
  },

  // No downgrade needed for this migration
  down: undefined,
};
