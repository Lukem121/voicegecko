/**
 * Type-Safe Versioned Settings Schemas
 *
 * This file contains complete type definitions for every version of settings
 * that has ever existed. This ensures type safety during migrations and
 * provides a complete historical record of settings changes.
 *
 * Each version is a complete snapshot of what settings looked like at that point.
 */

import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from '~/types/settings';

// =============================================================================
// SETTINGS VERSION 0 (Simulated Historical Version)
// =============================================================================
// This represents what settings might have looked like before the current system
// Since you're in early development, this is simulated to demonstrate the system

export type SettingsV0AudioSettings = {
  selectedDevice: AudioDevice | null;
  selectedSound: NotificationSound;
  notificationVolume: number;
  // Note: No muteSystemAudio or notificationTiming in V0
};

export type SettingsV0GeneralSettings = {
  launchOnStartup: boolean;
  // Note: No geckoBar settings in V0
};

export type SettingsV0PrivacySettings = {
  usageAnalytics: boolean;
  // Note: No crashReports in V0
};

// Note: No PersonalizationSettings or ModelSettings in V0

export type SettingsV0AppSettings = {
  audio: SettingsV0AudioSettings;
  general: SettingsV0GeneralSettings;
  privacy: SettingsV0PrivacySettings;
};

export type SettingsV0VersionedSettings = {
  _meta: {
    version: 0;
    timestamp: number;
    appVersion?: string;
  };
} & SettingsV0AppSettings;

// =============================================================================
// SETTINGS VERSION 1 (Current Version)
// =============================================================================
// This matches your current settings exactly

export type SettingsV1AudioSettings = {
  selectedDevice: AudioDevice | null;
  selectedSound: NotificationSound;
  notificationTiming: NotificationTiming; // Added in V1
  notificationVolume: number;
  muteSystemAudio: boolean; // Added in V1
};

export type SettingsV1GeneralSettings = {
  launchOnStartup: boolean;
  showGeckoBar: boolean; // Added in V1
  hideGeckoOnFullscreen: boolean; // Added in V1
};

export type SettingsV1PrivacySettings = {
  usageAnalytics: boolean;
  crashReports: boolean; // Added in V1
};

export type SettingsV1PersonalizationSettings = {
  interactionSounds: boolean;
  smartFormatting: boolean;
  autoAddToDictionary: boolean;
  autoPasteOnCompletion: boolean;
  preventPasteNewlines: boolean;
};

export type SettingsV1ModelStatus =
  | 'NotDownloaded'
  | { Downloading: number }
  | 'Downloaded';

export type SettingsV1Model = {
  name: string;
  description: string;
  size: string;
  ram: string;
  status: SettingsV1ModelStatus;
  sha: string;
  url: string;
  recommended: boolean;
  tier: string;
};

export type SettingsV1ModelSettings = {
  selectedTier: string;
  availableModels: Record<string, SettingsV1Model>;
};

export type SettingsV1OnboardingSettings = {
  completed: boolean;
};

export type SettingsV1AppSettings = {
  audio: SettingsV1AudioSettings;
  general: SettingsV1GeneralSettings;
  privacy: SettingsV1PrivacySettings;
  personalization: SettingsV1PersonalizationSettings; // Added in V1
  models: SettingsV1ModelSettings; // Added in V1
  onboarding: SettingsV1OnboardingSettings; // Added in V1
};

export type SettingsV1VersionedSettings = {
  _meta: {
    version: 1;
    timestamp: number;
    appVersion?: string;
  };
} & SettingsV1AppSettings;

// =============================================================================
// SETTINGS VERSION 2 (Example Future Version)
// =============================================================================
// This demonstrates how you'd add a new version in the future

// Most settings stay the same...
export type SettingsV2AudioSettings = SettingsV1AudioSettings;
export type SettingsV2GeneralSettings = SettingsV1GeneralSettings;
export type SettingsV2PrivacySettings = SettingsV1PrivacySettings;
export type SettingsV2ModelSettings = SettingsV1ModelSettings;
export type SettingsV2OnboardingSettings = SettingsV1OnboardingSettings;

// But PersonalizationSettings gets new fields
export type SettingsV2PersonalizationSettings = {
  interactionSounds: boolean;
  smartFormatting: boolean;
  autoAddToDictionary: boolean;
  autoPasteOnCompletion: boolean;
  preventPasteNewlines: boolean;
  // New in V2:
  autoCorrectTypos: boolean;
  customDictionary: string[];
};

export type SettingsV2AppSettings = {
  audio: SettingsV2AudioSettings;
  general: SettingsV2GeneralSettings;
  privacy: SettingsV2PrivacySettings;
  personalization: SettingsV2PersonalizationSettings;
  models: SettingsV2ModelSettings;
  onboarding: SettingsV2OnboardingSettings;
};

export type SettingsV2VersionedSettings = {
  _meta: {
    version: 2;
    timestamp: number;
    appVersion?: string;
  };
} & SettingsV2AppSettings;

// =============================================================================
// TYPE UNIONS AND HELPERS
// =============================================================================

// Union of all possible settings versions
export type AnyVersionedSettings =
  | SettingsV0VersionedSettings
  | SettingsV1VersionedSettings
  | SettingsV2VersionedSettings;

// Extract version number from settings
export type ExtractVersion<T extends AnyVersionedSettings> =
  T['_meta']['version'];

// Get settings type for specific version
export type SettingsForVersion<V extends number> = V extends 0
  ? SettingsV0VersionedSettings
  : V extends 1
    ? SettingsV1VersionedSettings
    : V extends 2
      ? SettingsV2VersionedSettings
      : never;

// Current latest version (this should match the highest version defined above)
export type CurrentSettings = SettingsV1VersionedSettings;
export const CURRENT_VERSION = 1 as const;

// Version validation helper
export function isValidVersion(
  version: number
): version is ExtractVersion<AnyVersionedSettings> {
  return version >= 0 && version <= CURRENT_VERSION;
}

// Runtime type guard to check if settings match a specific version
export function isSettingsVersion<
  V extends ExtractVersion<AnyVersionedSettings>,
>(
  settings: AnyVersionedSettings,
  version: V
): settings is SettingsForVersion<V> {
  return settings._meta.version === version;
}
