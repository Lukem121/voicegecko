/**
 * Type-Safe Settings Migration System
 *
 * This system provides complete type safety for settings migrations by using
 * strongly-typed version definitions and compile-time validation.
 */

import type {
  AnyVersionedSettings,
  ExtractVersion,
  SettingsForVersion,
} from './versioned-schemas';

// =============================================================================
// TYPE-SAFE MIGRATION INTERFACE
// =============================================================================

/**
 * Type-safe migration between specific versions
 *
 * @template FromVersion - The source version number
 * @template ToVersion - The target version number
 */
export type TypeSafeMigration<
  FromVersion extends ExtractVersion<AnyVersionedSettings>,
  ToVersion extends ExtractVersion<AnyVersionedSettings>,
> = {
  /** The target version this migration produces */
  version: ToVersion;

  /** Human-readable description of what this migration does */
  description: string;

  /**
   * Migrate settings from FromVersion to ToVersion
   * This function is fully type-safe - TypeScript will enforce that you
   * transform the settings correctly from the source to target shape.
   */
  up: (
    settings: SettingsForVersion<FromVersion>
  ) => SettingsForVersion<ToVersion>;

  /**
   * Optional rollback function for development/debugging
   * This is also fully type-safe.
   */
  down?: (
    settings: SettingsForVersion<ToVersion>
  ) => SettingsForVersion<FromVersion>;

  /**
   * Optional validation function to check if migration was successful
   * Useful for complex migrations where you want to verify the result.
   */
  validate?: (settings: SettingsForVersion<ToVersion>) => boolean;
};

// =============================================================================
// MIGRATION TYPES
// =============================================================================

// Migration from V1 to V2 (test migration)
export type MigrationV1ToV2 = TypeSafeMigration<1, 2>;

// Union of all possible migrations
export type AnyMigration = MigrationV1ToV2;

// =============================================================================
// MIGRATION RESULTS AND UTILITIES
// =============================================================================

export type MigrationResult = {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  error?: Error;
  /** Additional details about what was migrated */
  details?: {
    migrationsRun: number;
    settingsChanged: string[];
  };
};

/**
 * Migration step result for tracking individual migration progress
 */
export type MigrationStepResult = {
  fromVersion: number;
  toVersion: number;
  success: boolean;
  error?: Error;
  description: string;
};
