import { invoke } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from "~/types/settings";
import { CURRENT_SETTINGS_VERSION } from "~/lib/settings/migrations/registry";

// Settings types
interface AudioSettings {
  selectedDevice: AudioDevice | null;
  selectedSound: NotificationSound;
  notificationTiming: NotificationTiming;
  notificationVolume: number;
  muteSystemAudio: boolean;
}

interface GeneralSettings {
  launchOnStartup: boolean;
  showGeckoBar: boolean;
  hideGeckoOnFullscreen: boolean;
}

interface PrivacySettings {
  usageAnalytics: boolean;
  crashReports: boolean;
}

interface PersonalizationSettings {
  interactionSounds: boolean;
  smartFormatting: boolean;
  autoAddToDictionary: boolean;
}

// Model types
export type ModelStatus =
  | "NotDownloaded"
  | { Downloading: number }
  | "Downloaded";

export interface Model {
  name: string;
  description: string;
  size: string;
  ram: string;
  status: ModelStatus;
  sha: string;
  url: string;
  recommended: boolean;
}

interface ModelSettings {
  selectedModel: string;
  availableModels: Record<string, Model>;
}

export interface AppSettings {
  audio: AudioSettings;
  general: GeneralSettings;
  privacy: PrivacySettings;
  personalization: PersonalizationSettings;
  models: ModelSettings;
}

interface SettingsState {
  // Settings data
  settings: AppSettings;
  audioDevices: AudioDevice[];
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  initialize: () => Promise<void>;
  updateAudioDevice: (device: AudioDevice | null) => Promise<void>;
  updateNotificationSound: (sound: NotificationSound) => Promise<void>;
  updateNotificationTiming: (timing: NotificationTiming) => Promise<void>;
  updateNotificationVolume: (volume: number) => Promise<void>;
  updateMuteSystemAudio: (mute: boolean) => Promise<void>;
  updateLaunchOnStartup: (enabled: boolean) => Promise<void>;
  updateShowGeckoBar: (enabled: boolean) => Promise<void>;
  updateHideGeckoOnFullscreen: (enabled: boolean) => Promise<void>;
  updatePrivacySetting: (
    key: keyof PrivacySettings,
    value: boolean,
  ) => Promise<void>;
  updatePersonalizationSetting: (
    key: keyof PersonalizationSettings,
    value: boolean,
  ) => Promise<void>;
  refreshAudioDevices: () => Promise<void>;

  // Model actions
  updateSelectedModel: (modelId: string) => Promise<void>;
  refreshModels: () => Promise<void>;
  updateModelStatus: (modelId: string, status: ModelStatus) => void;
}

const audioStore = new LazyStore("settings.json");
const generalStore = new LazyStore("general-settings.json");

// Default settings
const defaultSettings: AppSettings = {
  audio: {
    selectedDevice: null,
    selectedSound: "chime",
    notificationTiming: "start_completion",
    notificationVolume: 1.0,
    muteSystemAudio: true,
  },
  general: {
    launchOnStartup: false,
    showGeckoBar: true,
    hideGeckoOnFullscreen: true,
  },
  privacy: {
    usageAnalytics: false,
    crashReports: true,
  },
  personalization: {
    interactionSounds: true,
    smartFormatting: true,
    autoAddToDictionary: true,
  },
  models: {
    selectedModel: "cloud",
    availableModels: {},
  },
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      settings: defaultSettings,
      audioDevices: [],
      isInitialized: false,
      isLoading: false,

      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
          // Load all settings in parallel
          const [
            audioSettings,
            geckoBarConfig,
            autostartConfig,
            audioDevices,
            privacySettings,
            personalizationSettings,
            models,
            selectedModel,
          ] = await Promise.all([
            loadAudioSettings(),
            invoke<{ enabled: boolean; hideOnFullscreen?: boolean }>(
              "get_gecko_bar_config",
            ),
            invoke<{ enabled: boolean }>("get_autostart_config"),
            invoke<AudioDevice[]>("list_audio_devices"),
            loadPrivacySettings(),
            loadPersonalizationSettings(),
            invoke<Record<string, Model>>("list_models"),
            invoke<string | null>("get_selected_model"),
          ]);

          // Find selected device from saved settings
          const selectedDevice =
            audioDevices.find(
              (d) => d.name === audioSettings.selectedDevice?.name,
            ) ?? null;

          set({
            settings: {
              audio: {
                ...audioSettings,
                selectedDevice,
              },
              general: {
                launchOnStartup: autostartConfig.enabled,
                showGeckoBar: geckoBarConfig.enabled,
                hideGeckoOnFullscreen: geckoBarConfig.hideOnFullscreen ?? true,
              },
              privacy: privacySettings,
              personalization: personalizationSettings,
              models: {
                selectedModel: selectedModel ?? "cloud",
                availableModels: models,
              },
            },
            audioDevices,
            isInitialized: true,
            isLoading: false,
          });

          // Set initial volume
          if (audioSettings.notificationVolume !== undefined) {
            await invoke("set_volume", {
              volume: audioSettings.notificationVolume,
            });
          }
        } catch (error) {
          console.error("Failed to initialize settings:", error);
          set({ isLoading: false });
        }
      },

      updateAudioDevice: async (device) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, selectedDevice: device },
        };
        set({ settings: newSettings });
        await saveWithMeta(audioStore, "selectedDevice", device);
      },

      updateNotificationSound: async (sound) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, selectedSound: sound },
        };
        set({ settings: newSettings });
        await saveWithMeta(audioStore, "selectedSound", sound);
      },

      updateNotificationTiming: async (timing) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, notificationTiming: timing },
        };
        set({ settings: newSettings });
        await saveWithMeta(audioStore, "notificationTiming", timing);
      },

      updateNotificationVolume: async (volume) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, notificationVolume: volume },
        };
        set({ settings: newSettings });
        await saveWithMeta(audioStore, "notificationVolume", volume);
        await invoke("set_volume", { volume });
      },

      updateMuteSystemAudio: async (mute) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, muteSystemAudio: mute },
        };
        set({ settings: newSettings });
        await saveWithMeta(audioStore, "muteSystemAudio", mute);
      },

      updateLaunchOnStartup: async (enabled) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          general: { ...settings.general, launchOnStartup: enabled },
        };
        set({ settings: newSettings });
        await invoke("set_autostart_config", { config: { enabled } });
      },

      updateShowGeckoBar: async (enabled) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          general: { ...settings.general, showGeckoBar: enabled },
        };
        set({ settings: newSettings });

        const config = {
          enabled,
          hideOnFullscreen: settings.general.hideGeckoOnFullscreen,
        };
        await invoke("set_gecko_bar_config", { config });

        if (enabled) {
          await invoke("show_gecko_bar");
        } else {
          await invoke("hide_gecko_bar");
        }
      },

      updateHideGeckoOnFullscreen: async (enabled) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          general: { ...settings.general, hideGeckoOnFullscreen: enabled },
        };
        set({ settings: newSettings });

        const config = {
          enabled: settings.general.showGeckoBar,
          hideOnFullscreen: enabled,
        };
        await invoke("set_gecko_bar_config", { config });
      },

      updatePrivacySetting: async (key, value) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          privacy: { ...settings.privacy, [key]: value },
        };
        set({ settings: newSettings });
        await saveWithMeta(generalStore, `privacy.${key}`, value);
      },

      updatePersonalizationSetting: async (key, value) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          personalization: { ...settings.personalization, [key]: value },
        };
        set({ settings: newSettings });
        await saveWithMeta(generalStore, `personalization.${key}`, value);
      },

      refreshAudioDevices: async () => {
        try {
          const audioDevices =
            await invoke<AudioDevice[]>("list_audio_devices");
          set({ audioDevices });
        } catch (error) {
          console.error("Failed to refresh audio devices:", error);
        }
      },

      // Model actions
      updateSelectedModel: async (modelId) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          models: { ...settings.models, selectedModel: modelId },
        };
        set({ settings: newSettings });
        await invoke("set_selected_model", { modelId });
      },

      refreshModels: async () => {
        try {
          const models = await invoke<Record<string, Model>>("list_models");
          const { settings } = get();
          set({
            settings: {
              ...settings,
              models: { ...settings.models, availableModels: models },
            },
          });
        } catch (error) {
          console.error("Failed to refresh models:", error);
        }
      },

      updateModelStatus: (modelId, status) => {
        const { settings } = get();
        const model = settings.models.availableModels[modelId];
        if (!model) return;

        set({
          settings: {
            ...settings,
            models: {
              ...settings.models,
              availableModels: {
                ...settings.models.availableModels,
                [modelId]: { ...model, status },
              },
            },
          },
        });
      },
    }),
    {
      name: "settings-store",
    },
  ),
);

// Helper functions for loading settings
async function loadAudioSettings(): Promise<AudioSettings> {
  // Load settings without migration - that's handled by the migration manager
  return {
    selectedDevice:
      (await audioStore.get<AudioDevice>("selectedDevice")) ?? null,
    selectedSound:
      (await audioStore.get<NotificationSound>("selectedSound")) ?? "chime",
    notificationTiming:
      (await audioStore.get<NotificationTiming>("notificationTiming")) ??
      "start_completion",
    notificationVolume:
      (await audioStore.get<number>("notificationVolume")) ?? 1.0,
    muteSystemAudio: (await audioStore.get<boolean>("muteSystemAudio")) ?? true,
  };
}

async function loadPrivacySettings(): Promise<PrivacySettings> {
  return {
    usageAnalytics:
      (await generalStore.get<boolean>("privacy.usageAnalytics")) ?? false,
    crashReports:
      (await generalStore.get<boolean>("privacy.crashReports")) ?? true,
  };
}

async function loadPersonalizationSettings(): Promise<PersonalizationSettings> {
  return {
    interactionSounds:
      (await generalStore.get<boolean>("personalization.interactionSounds")) ??
      true,
    smartFormatting:
      (await generalStore.get<boolean>("personalization.smartFormatting")) ??
      true,
    autoAddToDictionary:
      (await generalStore.get<boolean>(
        "personalization.autoAddToDictionary",
      )) ?? true,
  };
}

/**
 * Save settings with version metadata
 */
async function saveWithMeta(
  store: LazyStore,
  key: string,
  value: any,
): Promise<void> {
  await store.set(key, value);

  // Update metadata timestamp whenever we save
  const currentMeta = (await store.get<any>("_meta")) ?? {};
  await store.set("_meta", {
    ...currentMeta,
    version: CURRENT_SETTINGS_VERSION,
    timestamp: Date.now(),
    lastModifiedKey: key,
  });

  await store.save();
}
