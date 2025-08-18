/**
 * Migration from Settings V1 to V2 (Example Future Migration)
 *
 * This migration demonstrates how you would add new features in the future
 * with full type safety. This is a hypothetical migration that shows how
 * to add new personalization features.
 *
 * Changes in V2:
 * - Added autoCorrectTypos to personalization settings
 * - Added customDictionary array to personalization settings
 */

import type { MigrationV1ToV2 } from '../types';
import type {
  SettingsV1VersionedSettings,
  SettingsV2VersionedSettings,
} from '../versioned-schemas';

export const migrationV1ToV2: MigrationV1ToV2 = {
  version: 2,
  description: 'Add auto-correct and custom dictionary features',

  up: (v1Settings): SettingsV2VersionedSettings => {
    return {
      // Update metadata
      _meta: {
        version: 2,
        timestamp: Date.now(),
        appVersion: v1Settings._meta.appVersion,
      },

      // All other settings stay the same
      audio: v1Settings.audio,
      general: v1Settings.general,
      privacy: v1Settings.privacy,
      models: v1Settings.models,
      onboarding: v1Settings.onboarding,

      // Extend personalization settings with new features
      personalization: {
        // Keep all existing V1 personalization settings
        interactionSounds: v1Settings.personalization.interactionSounds,
        smartFormatting: v1Settings.personalization.smartFormatting,
        autoAddToDictionary: v1Settings.personalization.autoAddToDictionary,
        autoPasteOnCompletion: v1Settings.personalization.autoPasteOnCompletion,
        preventPasteNewlines: v1Settings.personalization.preventPasteNewlines,

        // Add new V2 features with sensible defaults
        autoCorrectTypos: false, // Default to disabled for safety
        customDictionary: [], // Start with empty custom dictionary
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
        // autoCorrectTypos and customDictionary are removed in rollback
      },
    };
  },

  validate: (v2Settings): boolean => {
    try {
      // Validate that all required V2 fields are present
      const personalization = v2Settings.personalization;

      // Check new V2 personalization fields
      if (typeof personalization.autoCorrectTypos !== 'boolean') {
        return false;
      }
      if (!Array.isArray(personalization.customDictionary)) {
        return false;
      }

      // Validate custom dictionary entries are strings
      for (const word of personalization.customDictionary) {
        if (typeof word !== 'string') {
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
