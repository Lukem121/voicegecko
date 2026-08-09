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
  AudioPipelineSettings,
  NotificationSound,
  NotificationTiming,
} from '~/types/settings';

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
  pipeline: AudioPipelineSettings;
};

export type SettingsV1GeneralSettings = {
  launchOnStartup: boolean;
  showGeckoBar: boolean; // Added in V1
  hideGeckoOnFullscreen: boolean; // Added in V1
  showGeckoBarWhileRecording: boolean;
};

export type SettingsV1PrivacySettings = {
  usageAnalytics: boolean;
  crashReports: boolean; // Added in V1
  airGap: boolean; // Privacy / air-gap mode — skip updater & connectivity probes
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
  selectedModelOverride?: string | null; // For admin-only individual model selection
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
// SETTINGS VERSION 2 (Test Migration)
// =============================================================================
// This demonstrates the migration system in action

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
  testFeature: boolean;
  testArray: string[];
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
// SETTINGS VERSION 3 (v2 dictation rewrite)
// =============================================================================

export type SettingsV3FeatureFlags = {
  moonshineFlow: boolean;
  engineLab: boolean;
  gpuWhisper: boolean;
  localLlmPolish: boolean;
  requireAuth: boolean;
};

export type SettingsV3DictationSettings = {
  intentEnabled: boolean;
  llmServerUrl: string;
  modeEngineOverrides: Record<string, string>;
  toggleBatchShowLivePreview: boolean;
  devContext: string;
  forceDeveloperProfile: boolean;
};

export type SettingsV3AppSettings = SettingsV2AppSettings & {
  dictation: SettingsV3DictationSettings;
  features: SettingsV3FeatureFlags;
};

export type SettingsV3VersionedSettings = {
  _meta: {
    version: 3;
    timestamp: number;
    appVersion?: string;
  };
} & SettingsV3AppSettings;

export type SettingsV4VersionedSettings = {
  _meta: {
    version: 4;
    timestamp: number;
    appVersion?: string;
  };
} & SettingsV3AppSettings;

// =============================================================================
// TYPE UNIONS AND HELPERS
// =============================================================================

// Union of all possible settings versions
export type AnyVersionedSettings =
  | SettingsV1VersionedSettings
  | SettingsV2VersionedSettings
  | SettingsV3VersionedSettings
  | SettingsV4VersionedSettings;

// Extract version number from settings
export type ExtractVersion<T extends AnyVersionedSettings> =
  T['_meta']['version'];

// Get settings type for specific version
export type SettingsForVersion<V extends number> = V extends 1
  ? SettingsV1VersionedSettings
  : V extends 2
    ? SettingsV2VersionedSettings
    : V extends 3
      ? SettingsV3VersionedSettings
      : V extends 4
        ? SettingsV4VersionedSettings
        : never;

export type CurrentSettings = SettingsV4VersionedSettings;
export const CURRENT_VERSION = 4 as const;

// Version validation helper
export function isValidVersion(
  version: number
): version is ExtractVersion<AnyVersionedSettings> {
  return version === 1 || version === 2 || version === 3 || version === 4;
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
