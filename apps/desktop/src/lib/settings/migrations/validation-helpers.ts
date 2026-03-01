/**
 * Runtime Validation Helpers for Settings Migration Safety
 *
 * This module provides utilities for validating settings data at runtime,
 * ensuring data integrity during migrations, and providing helpful debugging tools.
 */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: validation requires many checks */

import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from '~/types/settings';
import type {
  AnyVersionedSettings,
  SettingsV1ModelStatus,
  SettingsV1VersionedSettings,
  SettingsV2VersionedSettings,
} from './versioned-schemas';

// =============================================================================
// TYPE GUARDS FOR VERSION DETECTION
// =============================================================================

/**
 * Type guard to check if settings object is V1
 */
export function isSettingsV1(
  settings: AnyVersionedSettings
): settings is SettingsV1VersionedSettings {
  return settings._meta.version === 1;
}

/**
 * Type guard to check if settings object is V2
 */
export function isSettingsV2(
  settings: AnyVersionedSettings
): settings is SettingsV2VersionedSettings {
  return settings._meta.version === 2;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate that an object has the structure of versioned settings
 */
export function validateVersionedSettingsStructure(
  obj: unknown
): obj is AnyVersionedSettings {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const settings = obj as Record<string, unknown>;

  // Check for _meta field
  if (typeof settings._meta !== 'object' || settings._meta === null) {
    return false;
  }

  const meta = settings._meta as Record<string, unknown>;

  // Check version is a number
  if (typeof meta.version !== 'number') {
    return false;
  }

  // Check timestamp is a number
  if (typeof meta.timestamp !== 'number') {
    return false;
  }

  return true;
}

/**
 * Validate notification sound value
 */
export function isValidNotificationSound(
  value: unknown
): value is NotificationSound {
  return (
    typeof value === 'string' &&
    ['chime', 'ding', 'pop', 'beep'].includes(value)
  );
}

/**
 * Validate notification timing value
 */
export function isValidNotificationTiming(
  value: unknown
): value is NotificationTiming {
  return (
    typeof value === 'string' &&
    ['disabled', 'start_only', 'completion_only', 'start_completion'].includes(
      value
    )
  );
}

/**
 * Validate audio device structure
 */
export function isValidAudioDevice(value: unknown): value is AudioDevice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const device = value as Record<string, unknown>;
  return typeof device.name === 'string' && typeof device.id === 'string';
}

/**
 * Validate model status
 */
export function isValidModelStatus(
  value: unknown
): value is SettingsV1ModelStatus {
  if (value === 'NotDownloaded' || value === 'Downloaded') {
    return true;
  }

  if (typeof value === 'object' && value !== null) {
    const status = value as Record<string, unknown>;
    return (
      typeof status.Downloading === 'number' &&
      status.Downloading >= 0 &&
      status.Downloading <= 1
    );
  }

  return false;
}

// =============================================================================
// SETTINGS VALIDATORS BY VERSION
// =============================================================================

/**
 * Comprehensive validation for V1 settings (current version)
 */
export function validateV1Settings(
  settings: unknown
): settings is SettingsV1VersionedSettings {
  if (!validateVersionedSettingsStructure(settings)) {
    return false;
  }

  if (!isSettingsV1(settings)) {
    return false;
  }

  try {
    // Validate audio settings
    const audio = settings.audio;
    if (typeof audio !== 'object' || audio === null) {
      return false;
    }

    if (
      audio.selectedDevice !== null &&
      !isValidAudioDevice(audio.selectedDevice)
    ) {
      return false;
    }
    if (!isValidNotificationSound(audio.selectedSound)) {
      return false;
    }
    if (!isValidNotificationTiming(audio.notificationTiming)) {
      return false;
    }
    if (
      typeof audio.notificationVolume !== 'number' ||
      audio.notificationVolume < 0 ||
      audio.notificationVolume > 1
    ) {
      return false;
    }
    if (typeof audio.muteSystemAudio !== 'boolean') {
      return false;
    }

    // Validate general settings
    const general = settings.general;
    if (typeof general !== 'object' || general === null) {
      return false;
    }
    if (typeof general.launchOnStartup !== 'boolean') {
      return false;
    }
    if (typeof general.showGeckoBar !== 'boolean') {
      return false;
    }
    if (
      'showGeckoBarWhileRecording' in general &&
      typeof general.showGeckoBarWhileRecording !== 'boolean'
    ) {
      return false;
    }
    if (typeof general.hideGeckoOnFullscreen !== 'boolean') {
      return false;
    }

    // Validate privacy settings
    const privacy = settings.privacy;
    if (typeof privacy !== 'object' || privacy === null) {
      return false;
    }
    if (typeof privacy.usageAnalytics !== 'boolean') {
      return false;
    }
    if (typeof privacy.crashReports !== 'boolean') {
      return false;
    }

    // Validate personalization settings
    const personalization = settings.personalization;
    if (typeof personalization !== 'object' || personalization === null) {
      return false;
    }
    if (typeof personalization.interactionSounds !== 'boolean') {
      return false;
    }
    if (typeof personalization.smartFormatting !== 'boolean') {
      return false;
    }
    if (typeof personalization.autoAddToDictionary !== 'boolean') {
      return false;
    }
    if (typeof personalization.autoPasteOnCompletion !== 'boolean') {
      return false;
    }
    if (typeof personalization.preventPasteNewlines !== 'boolean') {
      return false;
    }

    // Validate model settings
    const models = settings.models;
    if (typeof models !== 'object' || models === null) {
      return false;
    }
    if (typeof models.selectedTier !== 'string') {
      return false;
    }
    if (
      typeof models.availableModels !== 'object' ||
      models.availableModels === null
    ) {
      return false;
    }

    // Validate each model in availableModels
    for (const [key, model] of Object.entries(models.availableModels)) {
      if (typeof key !== 'string') {
        return false;
      }
      if (typeof model !== 'object' || model === null) {
        return false;
      }

      const m = model as Record<string, unknown>;
      if (typeof m.name !== 'string') {
        return false;
      }
      if (typeof m.description !== 'string') {
        return false;
      }
      if (typeof m.size !== 'string') {
        return false;
      }
      if (typeof m.ram !== 'string') {
        return false;
      }
      if (!isValidModelStatus(m.status)) {
        return false;
      }
      if (typeof m.sha !== 'string') {
        return false;
      }
      if (typeof m.url !== 'string') {
        return false;
      }
      if (typeof m.recommended !== 'boolean') {
        return false;
      }
      if (typeof m.tier !== 'string') {
        return false;
      }
    }

    // Validate onboarding settings
    const onboarding = settings.onboarding;
    if (typeof onboarding !== 'object' || onboarding === null) {
      return false;
    }
    if (typeof onboarding.completed !== 'boolean') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Comprehensive validation for V2 settings
 */
export function validateV2Settings(
  settings: unknown
): settings is SettingsV2VersionedSettings {
  if (!validateVersionedSettingsStructure(settings)) {
    return false;
  }

  if (!isSettingsV2(settings)) {
    return false;
  }

  // First validate as V1 (since V2 extends V1)
  const v1ValidationSettings = {
    ...settings,
    _meta: { ...settings._meta, version: 1 },
    personalization: {
      interactionSounds: settings.personalization.interactionSounds,
      smartFormatting: settings.personalization.smartFormatting,
      autoAddToDictionary: settings.personalization.autoAddToDictionary,
      autoPasteOnCompletion: settings.personalization.autoPasteOnCompletion,
      preventPasteNewlines: settings.personalization.preventPasteNewlines,
    },
  };

  if (!validateV1Settings(v1ValidationSettings)) {
    return false;
  }

  try {
    // Validate V2-specific personalization fields
    const personalization = settings.personalization;
    if (typeof personalization !== 'object' || personalization === null) {
      return false;
    }
    if (typeof personalization.testFeature !== 'boolean') {
      return false;
    }
    if (!Array.isArray(personalization.testArray)) {
      return false;
    }

    // Validate test array entries are strings
    for (const item of personalization.testArray) {
      if (typeof item !== 'string') {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// GENERIC VALIDATION DISPATCHER
// =============================================================================

/**
 * Validate settings based on their version
 */
export function validateSettings(
  settings: unknown
): settings is AnyVersionedSettings {
  if (!validateVersionedSettingsStructure(settings)) {
    return false;
  }

  const version = (settings as AnyVersionedSettings)._meta.version;

  switch (version) {
    case 1:
      return validateV1Settings(settings);
    case 2:
      return validateV2Settings(settings);
    default:
      return false;
  }
}

// =============================================================================
// DEBUGGING AND DIAGNOSTIC HELPERS
// =============================================================================

/**
 * Get detailed validation report for debugging
 */
export function getValidationReport(settings: unknown): {
  isValid: boolean;
  version: number | null;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (!validateVersionedSettingsStructure(settings)) {
    return {
      isValid: false,
      version: null,
      errors: [
        'Invalid settings structure: missing _meta or invalid version/timestamp',
      ],
      warnings: [],
    };
  }

  const versionedSettings = settings as AnyVersionedSettings;
  const version = versionedSettings._meta.version;

  // Validate based on version
  const isValid = validateSettings(settings);

  if (!isValid) {
    errors.push(`Settings validation failed for version ${version}`);
  }

  // Check for missing optional fields
  if (
    version >= 1 &&
    isSettingsV1(versionedSettings) &&
    !versionedSettings._meta.appVersion
  ) {
    warnings.push('Missing appVersion in metadata');
  }

  return {
    isValid,
    version,
    errors,
    warnings,
  };
}

/**
 * Deep clone settings object for safe mutation during migrations
 */
export function cloneSettings<T extends AnyVersionedSettings>(settings: T): T {
  return JSON.parse(JSON.stringify(settings)) as T;
}

/**
 * Compare two settings objects and return differences
 */
export function compareSettings(
  oldSettings: AnyVersionedSettings,
  newSettings: AnyVersionedSettings
): {
  changed: string[];
  added: string[];
  removed: string[];
} {
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  const oldFlat = flattenObject(oldSettings);
  const newFlat = flattenObject(newSettings);

  // Find changes and removals
  for (const [key, oldValue] of Object.entries(oldFlat)) {
    if (!(key in newFlat)) {
      removed.push(key);
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newFlat[key])) {
      changed.push(key);
    }
  }

  // Find additions
  for (const key of Object.keys(newFlat)) {
    if (!(key in oldFlat)) {
      added.push(key);
    }
  }

  return { changed, added, removed };
}

/**
 * Flatten nested object for comparison
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(
        flattened,
        flattenObject(value as Record<string, unknown>, newKey)
      );
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}
