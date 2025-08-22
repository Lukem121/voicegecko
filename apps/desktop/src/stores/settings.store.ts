import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { LazyStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { analytics } from '~/lib/analytics/posthog-analytics';
import { CURRENT_SETTINGS_VERSION } from '~/lib/settings/migrations/registry';
// Import versioned settings types
import type {
  SettingsV1AppSettings,
  SettingsV1AudioSettings,
  SettingsV1GeneralSettings,
  SettingsV1Model,
  SettingsV1ModelSettings,
  SettingsV1ModelStatus,
  SettingsV1OnboardingSettings,
  SettingsV1PersonalizationSettings,
  SettingsV1PrivacySettings,
} from '~/lib/settings/migrations/versioned-schemas';
import { recordingService } from '~/services/recording.service';
import { transcriptionService } from '~/services/transcription.service';
import type { HardwareInfo } from '~/types/models';
import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from '~/types/settings';

// Use versioned settings types for type safety
type AudioSettings = SettingsV1AudioSettings;
type GeneralSettings = SettingsV1GeneralSettings;
type PrivacySettings = SettingsV1PrivacySettings;
type PersonalizationSettings = SettingsV1PersonalizationSettings;
type ModelSettings = SettingsV1ModelSettings;
type OnboardingSettings = SettingsV1OnboardingSettings;

// Export types for external use (maintain backwards compatibility)
export type { OnboardingSettings };
export type ModelStatus = SettingsV1ModelStatus;
export type Model = SettingsV1Model;
export type AppSettings = SettingsV1AppSettings;

type SettingsState = {
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
    value: boolean
  ) => Promise<void>;
  updatePersonalizationSetting: (
    key: keyof PersonalizationSettings,
    value: boolean
  ) => Promise<void>;
  refreshAudioDevices: () => Promise<void>;

  // Model actions
  updateSelectedTier: (tier: string) => Promise<void>;
  updateSelectedModelOverride: (modelId: string | null) => Promise<void>;
  refreshModels: () => Promise<void>;
  updateModelStatus: (modelId: string, status: ModelStatus) => void;
  getModelsForTier: (tier: string) => Model[];
  getTierDownloadStatus: (
    tier: string
  ) => 'none' | 'partial' | 'complete' | 'downloading';
  getSelectedModelOverride: () => string | null | undefined;

  // Test sound
  playTestSound: () => Promise<void>;

  // Onboarding actions
  updateOnboardingCompleted: (completed: boolean) => Promise<void>;
};

const settingsStore = new LazyStore('settings.json');

// Default settings
const defaultSettings: AppSettings = {
  audio: {
    selectedDevice: null,
    selectedSound: 'chime',
    notificationTiming: 'start_completion',
    notificationVolume: 1.0,
    muteSystemAudio: true,
  },
  general: {
    launchOnStartup: true,
    showGeckoBar: true,
    hideGeckoOnFullscreen: true,
  },
  privacy: {
    usageAnalytics: true,
    crashReports: true,
  },
  personalization: {
    interactionSounds: true,
    smartFormatting: true,
    autoAddToDictionary: true,
    autoPasteOnCompletion: true,
    preventPasteNewlines: false,
  },
  models: {
    selectedTier: 'cloud',
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
        if (get().isInitialized) {
          return;
        }

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
            selectedModelOverride,
            hardwareInfo,
          ] = await Promise.all([
            loadAudioSettings(),
            invoke<{ enabled: boolean; hideOnFullscreen?: boolean }>(
              'get_gecko_bar_config'
            ),
            invoke<{ enabled: boolean }>('get_autostart_config'),
            invoke<AudioDevice[]>('list_audio_devices'),
            loadPrivacySettings(),
            loadPersonalizationSettings(),
            invoke<Record<string, Model>>('list_models'),
            invoke<string | null>('get_selected_tier'),
            invoke<string | null>('get_selected_model_override'),
            invoke<HardwareInfo>('get_hardware_info'),
          ]);

          // Find selected device from saved settings
          const selectedDevice =
            audioDevices.find(
              (d) => d.name === audioSettings.selectedDevice?.name
            ) ?? null;

          // Load onboarding settings
          const onboardingCompleted =
            (await settingsStore.get<boolean>('onboarding.completed')) ?? false;

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
                selectedTier: selectedTier ?? 'cloud',
                selectedModelOverride: selectedModelOverride ?? null,
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
            await invoke('set_volume', {
              volume: audioSettings.notificationVolume,
            });
          }

          // Refresh models again to ensure we have the latest status after synchronization
          // This is important for detecting bundled models
          const refreshedModels =
            await invoke<Record<string, Model>>('list_models');
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
          listen<[string, number]>('model-download-progress', (event) => {
            const [modelId, progress] = event.payload;
            get().updateModelStatus(modelId, { Downloading: progress });
          });

          listen<string>('model-download-complete', () => {
            get().refreshModels();
          });
        } catch (error) {
          log.error('[Settings] Failed to initialize:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateAudioDevice: async (device) => {
        const { settings } = get();
        const oldDevice = settings.audio.selectedDevice;
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, selectedDevice: device },
        };

        // Track audio device change
        analytics.track('settings_changed', {
          category: 'audio',
          setting_key: 'selectedDevice',
          old_value: oldDevice?.name ?? null,
          new_value: device?.name ?? null,
        });

        if (device) {
          analytics.track('audio_device_changed', {
            device_name: device.name,
            device_type: device.name ? 'custom' : 'default',
          });
        }

        set({ settings: newSettings });
        await saveWithMeta(settingsStore, 'selectedDevice', device);
      },

      updateNotificationSound: async (sound) => {
        const { settings } = get();
        const oldSound = settings.audio.selectedSound;
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, selectedSound: sound },
        };

        // Track notification sound change
        analytics.track('settings_changed', {
          category: 'audio',
          setting_key: 'selectedSound',
          old_value: oldSound,
          new_value: sound,
        });

        set({ settings: newSettings });
        await saveWithMeta(settingsStore, 'selectedSound', sound);
      },

      updateNotificationTiming: async (timing) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, notificationTiming: timing },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, 'notificationTiming', timing);
      },

      updateNotificationVolume: async (volume) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, notificationVolume: volume },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, 'notificationVolume', volume);
        await invoke('set_volume', { volume });
      },

      updateMuteSystemAudio: async (mute) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, muteSystemAudio: mute },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, 'muteSystemAudio', mute);
      },

      updateLaunchOnStartup: async (enabled) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          general: { ...settings.general, launchOnStartup: enabled },
        };
        set({ settings: newSettings });
        await invoke('set_autostart_config', { config: { enabled } });
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
        await invoke('set_gecko_bar_config', { config });

        if (enabled) {
          await invoke('show_gecko_bar');
        } else {
          await invoke('hide_gecko_bar');
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
        await invoke('set_gecko_bar_config', { config });
      },

      updatePrivacySetting: async (key, value) => {
        const { settings } = get();
        const oldValue = settings.privacy[key];
        const newSettings = {
          ...settings,
          privacy: { ...settings.privacy, [key]: value },
        };

        // Track privacy setting change
        analytics.track('settings_changed', {
          category: 'privacy',
          setting_key: key,
          old_value: oldValue,
          new_value: value,
        });

        set({ settings: newSettings });
        await saveWithMeta(settingsStore, `privacy.${key}`, value);
      },

      updatePersonalizationSetting: async (key, value) => {
        const { settings } = get();
        const oldValue = settings.personalization[key];
        const newSettings = {
          ...settings,
          personalization: { ...settings.personalization, [key]: value },
        };

        // Track personalization setting change
        analytics.track('settings_changed', {
          category: 'personalization',
          setting_key: key,
          old_value: oldValue,
          new_value: value,
        });

        set({ settings: newSettings });
        await saveWithMeta(settingsStore, `personalization.${key}`, value);
      },

      refreshAudioDevices: async () => {
        try {
          const audioDevices =
            await invoke<AudioDevice[]>('list_audio_devices');
          set({ audioDevices });
        } catch (error) {
          log.error('Failed to refresh audio devices:', error);
        }
      },

      // Model actions
      updateSelectedTier: async (tier) => {
        const { settings } = get();
        const oldTier = settings.models.selectedTier;
        const newSettings = {
          ...settings,
          models: { ...settings.models, selectedTier: tier },
        };

        // Track model tier change
        analytics.track('settings_changed', {
          category: 'models',
          setting_key: 'selectedTier',
          old_value: oldTier,
          new_value: tier,
        });

        analytics.track('model_tier_changed', {
          old_tier: oldTier,
          new_tier: tier,
        });

        set({ settings: newSettings });
        await invoke('set_selected_tier', { tier });
      },

      updateSelectedModelOverride: async (modelId) => {
        const { settings } = get();
        const oldModelOverride = settings.models.selectedModelOverride;
        const newSettings = {
          ...settings,
          models: { ...settings.models, selectedModelOverride: modelId },
        };

        // Track model override change
        analytics.track('settings_changed', {
          category: 'models',
          setting_key: 'selectedModelOverride',
          old_value: oldModelOverride || 'none',
          new_value: modelId || 'none',
        });

        set({ settings: newSettings });

        if (modelId) {
          await invoke('set_selected_model_override', { modelId });
        } else {
          await invoke('clear_selected_model_override');
        }
      },

      getSelectedModelOverride: () => {
        const { settings } = get();
        return settings.models.selectedModelOverride;
      },

      refreshModels: async () => {
        try {
          const [models, selectedTier, selectedModelOverride] =
            await Promise.all([
              invoke<Record<string, Model>>('list_models'),
              invoke<string | null>('get_selected_tier'),
              invoke<string | null>('get_selected_model_override'),
            ]);

          set((state) => ({
            settings: {
              ...state.settings,
              models: {
                ...state.settings.models,
                availableModels: models,
                selectedTier:
                  selectedTier ?? state.settings.models.selectedTier,
                selectedModelOverride:
                  selectedModelOverride ??
                  state.settings.models.selectedModelOverride,
              },
            },
          }));
        } catch (error) {
          log.error('[Store] Failed to refresh models:', error);
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
              typeof model.tier === 'string'
                ? model.tier.toLowerCase()
                : model.tier;
            return modelTier === tier.toLowerCase();
          }
        );
      },

      getTierDownloadStatus: (tier) => {
        const { settings } = get();
        const models = Object.values(settings.models.availableModels);
        const tierModels = models.filter((model) => {
          // Handle case-insensitive comparison
          const modelTier =
            typeof model.tier === 'string'
              ? model.tier.toLowerCase()
              : model.tier;
          return modelTier === tier.toLowerCase();
        });

        if (tierModels.length === 0) {
          return 'none';
        }

        const downloading = tierModels.some(
          (model) =>
            typeof model.status === 'object' && 'Downloading' in model.status
        );

        // If any model in the tier is downloaded, the tier is complete
        // Users only need one model per tier to use that quality level
        const anyDownloaded = tierModels.some(
          (model) => model.status === 'Downloaded'
        );

        if (downloading) {
          return 'downloading';
        }

        if (anyDownloaded) {
          return 'complete';
        }

        return 'none';
      },

      playTestSound: async () => {
        const { settings } = get();

        // Track notification sound test
        analytics.track('notification_sound_tested', {
          sound_name: settings.audio.selectedSound,
          volume: settings.audio.notificationVolume,
        });

        // Check if interaction sounds are enabled
        if (!settings.personalization.interactionSounds) {
          log.info(
            '[Settings] Test sound disabled - interaction sounds are off'
          );
          return;
        }

        if (settings.audio.notificationTiming !== 'disabled') {
          await recordingService.playNotificationSound('Start');
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
        await saveWithMeta(settingsStore, 'onboarding.completed', completed);
      },
    }),
    {
      name: 'settings-store',
    }
  )
);

// Custom hooks for specific data
export const useHardwareInfo = () =>
  useSettingsStore((state) => state.hardwareInfo);

// Helper functions for loading settings
async function loadAudioSettings(): Promise<AudioSettings> {
  // Load settings without migration - that's handled by the migration manager
  return {
    selectedDevice:
      (await settingsStore.get<AudioDevice>('selectedDevice')) ?? null,
    selectedSound:
      (await settingsStore.get<NotificationSound>('selectedSound')) ?? 'chime',
    notificationTiming:
      (await settingsStore.get<NotificationTiming>('notificationTiming')) ??
      'start_completion',
    notificationVolume:
      (await settingsStore.get<number>('notificationVolume')) ?? 1.0,
    muteSystemAudio:
      (await settingsStore.get<boolean>('muteSystemAudio')) ?? true,
  };
}

async function loadPrivacySettings(): Promise<PrivacySettings> {
  return {
    usageAnalytics:
      (await settingsStore.get<boolean>('privacy.usageAnalytics')) ?? true,
    crashReports:
      (await settingsStore.get<boolean>('privacy.crashReports')) ?? true,
  };
}

async function loadPersonalizationSettings(): Promise<PersonalizationSettings> {
  return {
    interactionSounds:
      (await settingsStore.get<boolean>('personalization.interactionSounds')) ??
      true,
    smartFormatting:
      (await settingsStore.get<boolean>('personalization.smartFormatting')) ??
      true,
    autoAddToDictionary:
      (await settingsStore.get<boolean>(
        'personalization.autoAddToDictionary'
      )) ?? true,
    autoPasteOnCompletion:
      (await settingsStore.get<boolean>(
        'personalization.autoPasteOnCompletion'
      )) ?? true,
    preventPasteNewlines:
      (await settingsStore.get<boolean>(
        'personalization.preventPasteNewlines'
      )) ?? false,
  };
}

/**
 * Save settings with version metadata
 */
async function saveWithMeta(
  store: LazyStore,
  key: string,
  value: unknown
): Promise<void> {
  await store.set(key, value);

  // Update metadata timestamp whenever we save
  const currentMeta = (await store.get<unknown>('_meta')) ?? {};
  await store.set('_meta', {
    ...currentMeta,
    version: CURRENT_SETTINGS_VERSION,
    timestamp: Date.now(),
    lastModifiedKey: key,
  });

  await store.save();
}
