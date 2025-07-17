import type { Migration } from "../types";

/**
 * Migration 2 -> 3: Example of restructuring audio settings
 * This shows how you might restructure settings when the schema changes
 */
export const migration_2_to_3: Migration = {
  version: 3,
  description: "Restructure audio settings for better organization",

  up: (settings: any) => {
    const newSettings = { ...settings };

    // Example: Move flat audio settings into nested structure
    // Old structure: { selectedDevice: "...", volume: 0.5, ... }
    // New structure: { audio: { selectedDevice: "...", volume: 0.5 } }

    // Only migrate if we have old-style settings
    if (
      settings.selectedDevice !== undefined ||
      settings.volume !== undefined
    ) {
      newSettings.audio = {
        selectedDevice: settings.selectedDevice,
        selectedSound: settings.selectedSound || "chime",
        notificationTiming: settings.notificationTiming || "start_completion",
        notificationVolume:
          settings.volume || settings.notificationVolume || 1.0,
        muteSystemAudio: settings.muteSystemAudio ?? true,
      };

      // Clean up old properties
      delete newSettings.selectedDevice;
      delete newSettings.selectedSound;
      delete newSettings.notificationTiming;
      delete newSettings.volume;
      delete newSettings.notificationVolume;
      delete newSettings.muteSystemAudio;
    }

    // Update version
    newSettings._meta = {
      ...newSettings._meta,
      version: 3,
      timestamp: Date.now(),
    };

    return newSettings;
  },

  down: (settings: any) => {
    const oldSettings = { ...settings };

    // Reverse the migration if we have new-style settings
    if (settings.audio) {
      oldSettings.selectedDevice = settings.audio.selectedDevice;
      oldSettings.selectedSound = settings.audio.selectedSound;
      oldSettings.notificationTiming = settings.audio.notificationTiming;
      oldSettings.volume = settings.audio.notificationVolume;
      oldSettings.muteSystemAudio = settings.audio.muteSystemAudio;

      delete oldSettings.audio;
    }

    // Update version
    oldSettings._meta = {
      ...oldSettings._meta,
      version: 2,
      timestamp: Date.now(),
    };

    return oldSettings;
  },
};
