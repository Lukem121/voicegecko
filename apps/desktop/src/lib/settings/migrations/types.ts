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

// Legacy types (kept for backwards compatibility)
export type SettingsVersion = {
  version: number;
  timestamp: number;
  appVersion?: string;
};

// Base structure that all settings must have (legacy)
export type VersionedSettings = {
  _meta: SettingsVersion;
  [key: string]: unknown;
};

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
// SPECIFIC MIGRATION TYPES
// =============================================================================

// Migration from V0 to V1 (example historical migration)
export type MigrationV0ToV1 = TypeSafeMigration<0, 1>;

// Migration from V1 to V2 (example future migration)
export type MigrationV1ToV2 = TypeSafeMigration<1, 2>;

// Union of all possible migrations
export type AnyMigration = MigrationV0ToV1 | MigrationV1ToV2;

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

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Legacy migration interface for backwards compatibility
 * @deprecated Use TypeSafeMigration instead
 */
export type Migration<TFrom = VersionedSettings, TTo = VersionedSettings> = {
  version: number;
  description: string;
  up: (settings: TFrom) => TTo;
  down?: (settings: TTo) => TFrom;
};

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Extract the "from" version of a migration
 */
export type GetFromVersion<T extends AnyMigration> =
  T extends TypeSafeMigration<infer From, ExtractVersion<AnyVersionedSettings>>
    ? From
    : never;

/**
 * Extract the "to" version of a migration
 */
export type GetToVersion<T extends AnyMigration> = T extends TypeSafeMigration<
  ExtractVersion<AnyVersionedSettings>,
  infer To
>
  ? To
  : never;

/**
 * Check if a migration can be applied to settings of a specific version
 */
export type CanApplyMigration<
  M extends AnyMigration,
  SettingsVer extends ExtractVersion<AnyVersionedSettings>,
> = SettingsVer extends GetFromVersion<M> ? true : false;
