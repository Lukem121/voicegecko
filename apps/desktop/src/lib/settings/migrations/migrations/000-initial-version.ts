import type { Migration } from "../types";

/**
 * Migration 0 -> 1: Initial versioning for existing users
 * This migration runs for users who have settings but no version metadata
 */
export const migration_0_to_1: Migration = {
  version: 1,
  description: "Add initial version metadata to existing settings",

  up: (settings: any) => {
    // If settings already have _meta, they're already versioned
    if (settings._meta) {
      return settings;
    }

    // Add metadata to existing settings
    return {
      ...settings,
      _meta: {
        version: 1,
        timestamp: Date.now(),
        // Mark as legacy migration so we know this was an existing user
        legacy: true,
      },
    };
  },

  // No downgrade for initial versioning
  down: undefined,
};
