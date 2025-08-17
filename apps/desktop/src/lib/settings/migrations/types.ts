// Settings migration types - simplified for early development

export type SettingsVersion = {
  version: number;
  timestamp: number;
  appVersion?: string;
};

// Base structure that all settings must have
export type VersionedSettings = {
  _meta: SettingsVersion;
  [key: string]: unknown;
};

// Migration interface (for future use when you have users)
export type Migration<TFrom = VersionedSettings, TTo = VersionedSettings> = {
  version: number;
  description: string;
  up: (settings: TFrom) => TTo;
  down?: (settings: TTo) => TFrom; // For rollback support (optional)
};

export type MigrationResult = {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  error?: Error;
};
