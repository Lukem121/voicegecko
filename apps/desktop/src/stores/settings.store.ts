import type { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LazyStore, load } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { HardwareInfo } from "~/types/models";
import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from "~/types/settings";
import { CURRENT_SETTINGS_VERSION } from "~/lib/settings/migrations/registry";
import { recordingService } from "~/services/recording.service";
import { transcriptionService } from "~/services/transcription.service";

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
  autoPasteOnCompletion: boolean;
}

export interface OnboardingSettings {
  completed: boolean;
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
  tier: string;
}

interface ModelSettings {
  selectedTier: string;
  availableModels: Record<string, Model>;
}

export interface AppSettings {
  audio: AudioSettings;
  general: GeneralSettings;
  privacy: PrivacySettings;
  personalization: PersonalizationSettings;
  models: ModelSettings;
  onboarding: OnboardingSettings;
}

interface SettingsState {
  // Settings data
  settings: AppSettings;
  audioDevices: AudioDevice[];
  hardwareInfo: HardwareInfo | null;
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
  updateSelectedTier: (tier: string) => Promise<void>;
  refreshModels: () => Promise<void>;
  updateModelStatus: (modelId: string, status: ModelStatus) => void;
  getModelsForTier: (tier: string) => Model[];
  getTierDownloadStatus: (
    tier: string,
  ) => "none" | "partial" | "complete" | "downloading";

  // Test sound
  playTestSound: () => Promise<void>;

  // Onboarding actions
  updateOnboardingCompleted: (completed: boolean) => Promise<void>;
}

const settingsStore = new LazyStore("settings.json");

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
    launchOnStartup: true,
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
    autoPasteOnCompletion: true,
  },
  models: {
    selectedTier: "cloud",
    availableModels: {},
  },
  onboarding: {
    completed: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      settings: defaultSettings,
      audioDevices: [],
      hardwareInfo: null,
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
            selectedTier,
            hardwareInfo,
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
            invoke<string | null>("get_selected_tier"),
            invoke<HardwareInfo>("get_hardware_info"),
          ]);

          // Find selected device from saved settings
          const selectedDevice =
            audioDevices.find(
              (d) => d.name === audioSettings.selectedDevice?.name,
            ) ?? null;

          // Load onboarding settings
          const onboardingCompleted =
            (await settingsStore.get<boolean>("onboarding.completed")) ?? false;

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
                selectedTier: selectedTier ?? "cloud",
                availableModels: models,
              },
              onboarding: {
                completed: onboardingCompleted,
              },
            },
            audioDevices,
            hardwareInfo,
            isInitialized: true,
            isLoading: false,
          });

          // Set initial volume
          if (audioSettings.notificationVolume) {
            await invoke("set_volume", {
              volume: audioSettings.notificationVolume,
            });
          }

          // Refresh models again to ensure we have the latest status after synchronization
          // This is important for detecting bundled models
          const refreshedModels =
            await invoke<Record<string, Model>>("list_models");
          set((state) => ({
            settings: {
              ...state.settings,
              models: {
                ...state.settings.models,
                availableModels: refreshedModels,
              },
            },
          }));

          // Set up listeners for model download events
          // This ensures the store is updated even when downloads happen in the background
          void listen<[string, number]>("model-download-progress", (event) => {
            const [modelId, progress] = event.payload;
            get().updateModelStatus(modelId, { Downloading: progress });
          });

          void listen<string>("model-download-complete", () => {
            void get().refreshModels();
          });
        } catch (error) {
          console.error("[Settings] Failed to initialize:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateAudioDevice: async (device) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, selectedDevice: device },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, "selectedDevice", device);
      },

      updateNotificationSound: async (sound) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, selectedSound: sound },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, "selectedSound", sound);
      },

      updateNotificationTiming: async (timing) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, notificationTiming: timing },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, "notificationTiming", timing);
      },

      updateNotificationVolume: async (volume) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, notificationVolume: volume },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, "notificationVolume", volume);
        await invoke("set_volume", { volume });
      },

      updateMuteSystemAudio: async (mute) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, muteSystemAudio: mute },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, "muteSystemAudio", mute);
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
        await saveWithMeta(settingsStore, `privacy.${key}`, value);
      },

      updatePersonalizationSetting: async (key, value) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          personalization: { ...settings.personalization, [key]: value },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, `personalization.${key}`, value);
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
      updateSelectedTier: async (tier) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          models: { ...settings.models, selectedTier: tier },
        };
        set({ settings: newSettings });
        await invoke("set_selected_tier", { tier });
      },

      refreshModels: async () => {
        try {
          const [models, selectedTier] = await Promise.all([
            invoke<Record<string, Model>>("list_models"),
            invoke<string | null>("get_selected_tier"),
          ]);

          set((state) => ({
            settings: {
              ...state.settings,
              models: {
                ...state.settings.models,
                availableModels: models,
                selectedTier:
                  selectedTier ?? state.settings.models.selectedTier,
              },
            },
          }));
        } catch (error) {
          console.error("[Store] Failed to refresh models:", error);
        }
      },

      updateModelStatus: (modelId, status) => {
        set((state) => {
          const model = state.settings.models.availableModels[modelId];
          if (!model) {
            return state;
          }

          return {
            settings: {
              ...state.settings,
              models: {
                ...state.settings.models,
                availableModels: {
                  ...state.settings.models.availableModels,
                  [modelId]: {
                    ...model,
                    status,
                  },
                },
              },
            },
          };
        });
      },

      getModelsForTier: (tier) => {
        const { settings } = get();
        return Object.values(settings.models.availableModels).filter(
          (model) => {
            // Convert tier enum to lowercase string for comparison
            const modelTier =
              typeof model.tier === "string"
                ? model.tier.toLowerCase()
                : model.tier;
            return modelTier === tier.toLowerCase();
          },
        );
      },

      getTierDownloadStatus: (tier) => {
        const { settings } = get();
        const models = Object.values(settings.models.availableModels);
        const tierModels = models.filter((model) => {
          // Handle case-insensitive comparison
          const modelTier =
            typeof model.tier === "string"
              ? model.tier.toLowerCase()
              : model.tier;
          return modelTier === tier.toLowerCase();
        });

        if (tierModels.length === 0) {
          return "none";
        }

        const downloading = tierModels.some(
          (model) =>
            typeof model.status === "object" && "Downloading" in model.status,
        );

        // If any model in the tier is downloaded, the tier is complete
        // Users only need one model per tier to use that quality level
        const anyDownloaded = tierModels.some(
          (model) => model.status === "Downloaded",
        );

        if (downloading) {
          return "downloading";
        }

        if (anyDownloaded) {
          return "complete";
        }

        return "none";
      },

      playTestSound: async () => {
        const { settings } = get();

        // Check if interaction sounds are enabled
        if (!settings.personalization.interactionSounds) {
          console.log(
            "[Settings] Test sound disabled - interaction sounds are off",
          );
          return;
        }

        if (settings.audio.notificationTiming !== "disabled") {
          await recordingService.playNotificationSound("Start");
          await new Promise((resolve) => setTimeout(resolve, 700));
          await transcriptionService.playEndSoundIfEnabled();
        }
      },

      // Onboarding actions
      updateOnboardingCompleted: async (completed) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          onboarding: { ...settings.onboarding, completed },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, "onboarding.completed", completed);
      },
    }),
    {
      name: "settings-store",
    },
  ),
);

// Custom hooks for specific data
export const useHardwareInfo = () =>
  useSettingsStore((state) => state.hardwareInfo);

// Helper functions for loading settings
async function loadAudioSettings(): Promise<AudioSettings> {
  // Load settings without migration - that's handled by the migration manager
  return {
    selectedDevice:
      (await settingsStore.get<AudioDevice>("selectedDevice")) ?? null,
    selectedSound:
      (await settingsStore.get<NotificationSound>("selectedSound")) ?? "chime",
    notificationTiming:
      (await settingsStore.get<NotificationTiming>("notificationTiming")) ??
      "start_completion",
    notificationVolume:
      (await settingsStore.get<number>("notificationVolume")) ?? 1.0,
    muteSystemAudio:
      (await settingsStore.get<boolean>("muteSystemAudio")) ?? true,
  };
}

async function loadPrivacySettings(): Promise<PrivacySettings> {
  return {
    usageAnalytics:
      (await settingsStore.get<boolean>("privacy.usageAnalytics")) ?? false,
    crashReports:
      (await settingsStore.get<boolean>("privacy.crashReports")) ?? true,
  };
}

async function loadPersonalizationSettings(): Promise<PersonalizationSettings> {
  return {
    interactionSounds:
      (await settingsStore.get<boolean>("personalization.interactionSounds")) ??
      true,
    smartFormatting:
      (await settingsStore.get<boolean>("personalization.smartFormatting")) ??
      true,
    autoAddToDictionary:
      (await settingsStore.get<boolean>(
        "personalization.autoAddToDictionary",
      )) ?? true,
    autoPasteOnCompletion:
      (await settingsStore.get<boolean>(
        "personalization.autoPasteOnCompletion",
      )) ?? true,
  };
}

/**
 * Save settings with version metadata
 */
async function saveWithMeta(
  store: LazyStore,
  key: string,
  value: unknown,
): Promise<void> {
  await store.set(key, value);

  // Update metadata timestamp whenever we save
  const currentMeta = (await store.get<unknown>("_meta")) ?? {};
  await store.set("_meta", {
    ...currentMeta,
    version: CURRENT_SETTINGS_VERSION,
    timestamp: Date.now(),
    lastModifiedKey: key,
  });

  await store.save();
}
