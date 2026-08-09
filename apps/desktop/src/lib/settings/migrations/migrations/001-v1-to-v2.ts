/**
 * Migration from Settings V1 to V2 (Test Migration)
 *
 * This migration demonstrates the type-safe migration system in action.
 * It adds two new personalization settings to test the framework.
 *
 * Changes in V2:
 * - Added testFeature boolean to personalization settings
 * - Added testArray string array to personalization settings
 */

import type { MigrationV1ToV2 } from '../types';
import type {
  SettingsV1VersionedSettings,
  SettingsV2VersionedSettings,
} from '../versioned-schemas';

export const migrationV1ToV2: MigrationV1ToV2 = {
  version: 2,
  description: 'Add test feature settings for migration testing',

  up: (v1Settings): SettingsV2VersionedSettings => {
    return {
      // Update metadata
      _meta: {
        version: 2,
        timestamp: Date.now(),
        appVersion: v1Settings._meta.appVersion,
      },

      // All other settings stay the same (with defensive fallbacks)
      audio: v1Settings.audio ?? {
        selectedDevice: null,
        selectedSound: 'chime',
        notificationTiming: 'start_completion',
        notificationVolume: 1.0,
        muteSystemAudio: true,
      },
      general: v1Settings.general ?? {
        launchOnStartup: true,
        showGeckoBar: true,
        hideGeckoOnFullscreen: true,
      },
      privacy: v1Settings.privacy ?? {
        usageAnalytics: true,
        crashReports: true,
      },
      models: v1Settings.models ?? {
        selectedTier: 'cloud',
        availableModels: {},
      },
      onboarding: v1Settings.onboarding ?? {
        completed: false,
      },

      // Extend personalization settings with new V2 features
      personalization: {
        // Keep all existing V1 personalization settings (with fallbacks for partial data)
        interactionSounds:
          v1Settings.personalization?.interactionSounds ?? true,
        smartFormatting: v1Settings.personalization?.smartFormatting ?? true,
        autoAddToDictionary:
          v1Settings.personalization?.autoAddToDictionary ?? true,
        autoPasteOnCompletion:
          v1Settings.personalization?.autoPasteOnCompletion ?? true,
        preventPasteNewlines:
          v1Settings.personalization?.preventPasteNewlines ?? false,

        // Add new V2 features with sensible defaults
        testFeature: true, // Default to enabled for testing
        testArray: ['test1', 'test2'], // Sample test data
      },
    };
  },

  down: (v2Settings): SettingsV1VersionedSettings => {
    return {
      // Rollback metadata
      _meta: {
        version: 1,
        timestamp: Date.now(),
        appVersion: v2Settings._meta.appVersion,
      },

      // All other settings stay the same
      audio: v2Settings.audio,
      general: v2Settings.general,
      privacy: v2Settings.privacy,
      models: v2Settings.models,
      onboarding: v2Settings.onboarding,

      // Remove V2-specific fields from personalization
      personalization: {
        interactionSounds: v2Settings.personalization.interactionSounds,
        smartFormatting: v2Settings.personalization.smartFormatting,
        autoAddToDictionary: v2Settings.personalization.autoAddToDictionary,
        autoPasteOnCompletion: v2Settings.personalization.autoPasteOnCompletion,
        preventPasteNewlines: v2Settings.personalization.preventPasteNewlines,
        // testFeature and testArray are removed in rollback
      },
    };
  },

  validate: (v2Settings): boolean => {
    try {
      // Validate that all required V2 fields are present
      const personalization = v2Settings.personalization;

      // Check new V2 personalization fields
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

      // Check metadata
      if (v2Settings._meta.version !== 2) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },
};
