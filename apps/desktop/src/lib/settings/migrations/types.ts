// Settings migration types - simplified for early development

export interface SettingsVersion {
  version: number;
  timestamp: number;
  appVersion?: string;
}

// Base structure that all settings must have
export interface VersionedSettings {
  _meta: SettingsVersion;
  [key: string]: unknown;
}

// Migration interface (for future use when you have users)
export interface Migration<TFrom = any, TTo = any> {
  version: number;
  description: string;
  up: (settings: TFrom) => TTo;
  down?: (settings: TTo) => TFrom; // For rollback support (optional)
}

export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  error?: Error;
}
