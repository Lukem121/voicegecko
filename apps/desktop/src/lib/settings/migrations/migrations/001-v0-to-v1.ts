/**
 * Migration from Settings V0 to V1
 *
 * This migration demonstrates how to handle historical version migrations
 * with full type safety. Even though this is simulated (since you're in early
 * development), it shows how the system would work with real historical data.
 *
 * Changes in V1:
 * - Added muteSystemAudio and notificationTiming to audio settings
 * - Added geckoBar settings (showGeckoBar, hideGeckoOnFullscreen)
 * - Added crashReports to privacy settings
 * - Added personalization, models, and onboarding settings categories
 */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: lazy */

import type { MigrationV0ToV1 } from '../types';
import type {
  SettingsV0VersionedSettings,
  SettingsV1VersionedSettings,
} from '../versioned-schemas';

export const migrationV0ToV1: MigrationV0ToV1 = {
  version: 1,
  description:
    'Add geckoBar settings, personalization, models, and onboarding support',

  up: (v0Settings): SettingsV1VersionedSettings => {
    return {
      // Update metadata
      _meta: {
        version: 1,
        timestamp: Date.now(),
        appVersion: v0Settings._meta.appVersion,
      },

      // Migrate audio settings - add new fields with sensible defaults
      audio: {
        selectedDevice: v0Settings.audio.selectedDevice,
        selectedSound: v0Settings.audio.selectedSound,
        notificationVolume: v0Settings.audio.notificationVolume,
        // New fields in V1:
        notificationTiming: 'start_completion', // Default to both sounds
        muteSystemAudio: true, // Default to muted for better UX
      },

      // Migrate general settings - add geckoBar support
      general: {
        launchOnStartup: v0Settings.general.launchOnStartup,
        // New fields in V1:
        showGeckoBar: true, // Default to showing the geckoBar
        hideGeckoOnFullscreen: true, // Default to hiding in fullscreen
      },

      // Migrate privacy settings - add crash reports
      privacy: {
        usageAnalytics: v0Settings.privacy.usageAnalytics,
        // New field in V1:
        crashReports: true, // Default to enabled for better support
      },

      // New in V1: Personalization settings with sensible defaults
      personalization: {
        interactionSounds: true,
        smartFormatting: true,
        autoAddToDictionary: true,
        autoPasteOnCompletion: true,
        preventPasteNewlines: false,
      },

      // New in V1: Model settings with sensible defaults
      models: {
        selectedTier: 'cloud', // Default to cloud for new users
        availableModels: {}, // Will be populated by the app
      },

      // New in V1: Onboarding settings
      onboarding: {
        completed: true, // Existing users skip onboarding
      },
    };
  },

  down: (v1Settings): SettingsV0VersionedSettings => {
    // Rollback to V0 by removing V1-specific fields
    return {
      _meta: {
        version: 0,
        timestamp: Date.now(),
        appVersion: v1Settings._meta.appVersion,
      },

      // Remove V1 fields from audio
      audio: {
        selectedDevice: v1Settings.audio.selectedDevice,
        selectedSound: v1Settings.audio.selectedSound,
        notificationVolume: v1Settings.audio.notificationVolume,
        // muteSystemAudio and notificationTiming are removed
      },

      // Remove V1 fields from general
      general: {
        launchOnStartup: v1Settings.general.launchOnStartup,
        // showGeckoBar and hideGeckoOnFullscreen are removed
      },

      // Remove V1 fields from privacy
      privacy: {
        usageAnalytics: v1Settings.privacy.usageAnalytics,
        // crashReports is removed
      },

      // personalization, models, and onboarding categories are completely removed
    };
  },

  validate: (v1Settings): boolean => {
    try {
      // Validate that all required V1 fields are present and have valid values
      const audio = v1Settings.audio;
      const general = v1Settings.general;
      const privacy = v1Settings.privacy;
      const personalization = v1Settings.personalization;
      const models = v1Settings.models;
      const onboarding = v1Settings.onboarding;

      // Check audio settings
      if (typeof audio.muteSystemAudio !== 'boolean') {
        return false;
      }
      if (
        ![
          'disabled',
          'start_only',
          'completion_only',
          'start_completion',
        ].includes(audio.notificationTiming)
      ) {
        return false;
      }

      // Check general settings
      if (typeof general.showGeckoBar !== 'boolean') {
        return false;
      }
      if (typeof general.hideGeckoOnFullscreen !== 'boolean') {
        return false;
      }

      // Check privacy settings
      if (typeof privacy.crashReports !== 'boolean') {
        return false;
      }

      // Check personalization settings
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

      // Check models settings
      if (typeof models.selectedTier !== 'string') {
        return false;
      }
      if (
        typeof models.availableModels !== 'object' ||
        models.availableModels === null
      ) {
        return false;
      }

      // Check onboarding settings
      if (typeof onboarding.completed !== 'boolean') {
        return false;
      }

      // Check metadata
      if (v1Settings._meta.version !== 1) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },
};
