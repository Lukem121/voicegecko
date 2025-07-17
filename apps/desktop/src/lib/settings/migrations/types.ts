// Settings migration types

export interface SettingsVersion {
  version: number;
  timestamp: number;
  appVersion?: string;
}

export interface Migration {
  version: number;
  description: string;
  up: (settings: any) => any;
  down?: (settings: any) => any; // For rollback support
}

export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  error?: Error;
  backedUp?: boolean;
}

// Base structure that all settings must have
export interface VersionedSettings {
  _meta: SettingsVersion;
  [key: string]: any;
}

// For future cloud sync
export interface SyncableSettings extends VersionedSettings {
  _sync?: {
    lastSynced?: number;
    deviceId?: string;
    conflicts?: {
      key: string;
      localValue: any;
      remoteValue: any;
      timestamp: number;
    }[];
  };
}
