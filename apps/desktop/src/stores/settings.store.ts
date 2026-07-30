import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { analytics } from '~/lib/analytics/posthog-analytics';
import { CURRENT_SETTINGS_VERSION } from '~/lib/settings/migrations/registry';
// Import versioned settings types
import type {
  SettingsV1AppSettings,
  SettingsV1AudioSettings,
  SettingsV1Model,
  SettingsV1ModelStatus,
  SettingsV1OnboardingSettings,
  SettingsV1PersonalizationSettings,
  SettingsV1PrivacySettings,
  SettingsV3DictationSettings,
  SettingsV3FeatureFlags,
} from '~/lib/settings/migrations/versioned-schemas';
import { dictationService } from '~/services/dictation.service';
import { recordingService } from '~/services/recording.service';
import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from '~/types/settings';

// Use versioned settings types for type safety
type AudioSettings = SettingsV1AudioSettings;
type PrivacySettings = SettingsV1PrivacySettings;
type PersonalizationSettings = SettingsV1PersonalizationSettings;
type OnboardingSettings = SettingsV1OnboardingSettings;

// Export types for external use (maintain backwards compatibility)
export type { OnboardingSettings };
export type ModelStatus = SettingsV1ModelStatus;
export type Model = SettingsV1Model;
export type AppSettings = SettingsV1AppSettings & {
  dictation: SettingsV3DictationSettings;
  features: SettingsV3FeatureFlags;
};

type SettingsState = {
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
  updateAudioPipeline: (
    pipeline: Partial<AudioSettings['pipeline']>
  ) => Promise<void>;
  updateLaunchOnStartup: (enabled: boolean) => Promise<void>;
  updateShowGeckoBar: (enabled: boolean) => Promise<void>;
  updateShowGeckoBarWhileRecording: (enabled: boolean) => Promise<void>;
  updateHideGeckoOnFullscreen: (enabled: boolean) => Promise<void>;
  updatePrivacySetting: (
    key: keyof PrivacySettings,
    value: boolean
  ) => Promise<void>;
  updatePersonalizationSetting: (
    key: keyof PersonalizationSettings,
    value: boolean
  ) => Promise<void>;
  updateDictationSetting: <K extends keyof SettingsV3DictationSettings>(
    key: K,
    value: SettingsV3DictationSettings[K]
  ) => Promise<void>;
  updateFeatureSetting: <K extends keyof SettingsV3FeatureFlags>(
    key: K,
    value: SettingsV3FeatureFlags[K]
  ) => Promise<void>;
  refreshAudioDevices: () => Promise<void>;

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
    pipeline: {
      enableDenoise: false,
      enableHighPass: true,
      enableTrimSilence: true,
      highPassHz: 80,
      targetRms: 0.22,
    },
  },
  general: {
    launchOnStartup: true,
    showGeckoBar: true,
    showGeckoBarWhileRecording: false,
    hideGeckoOnFullscreen: true,
  },
  // Update preferences are added lazily to preserve migration path
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
  dictation: {
    intentEnabled: true,
    llmServerUrl: 'http://127.0.0.1:8080',
    modeEngineOverrides: {},
    toggleBatchShowLivePreview: true,
    devContext:
      'TypeScript, React, Rust, Tauri, VoiceGecko, Cursor, coding agents, software engineering',
    forceDeveloperProfile: false,
  },
  features: {
    moonshineFlow: true,
    engineLab: true,
    cloudGpt4o: true,
    gpuWhisper: true,
    localLlmPolish: false,
    requireAuth: false,
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
            dictationSettings,
            featureSettings,
          ] = await Promise.all([
            loadAudioSettings(),
            invoke<{
              enabled: boolean;
              hideOnFullscreen?: boolean;
              showOnlyWhileRecording?: boolean;
            }>('get_gecko_bar_config'),
            invoke<{ enabled: boolean }>('get_autostart_config'),
            invoke<AudioDevice[]>('list_audio_devices'),
            loadPrivacySettings(),
            loadPersonalizationSettings(),
            loadDictationSettings(),
            loadFeatureSettings(),
          ]);

          // Find selected device from saved settings
          const selectedDevice =
            audioDevices.find(
              (d) => d.name === audioSettings.selectedDevice?.name
            ) ?? null;

          // Load onboarding settings
          const onboardingCompleted =
            (await settingsStore.get<boolean>('onboarding.completed')) ?? false;

          void invoke('set_intent_enabled', {
            enabled: dictationSettings.intentEnabled,
          }).catch(() => undefined);

          void invoke('set_feature_flags', {
            flags: {
              moonshineFlow: featureSettings.moonshineFlow,
              engineLab: featureSettings.engineLab,
              cloudGpt4o: featureSettings.cloudGpt4o,
              gpuWhisper: featureSettings.gpuWhisper,
              localLlmPolish: featureSettings.localLlmPolish,
              requireAuth: featureSettings.requireAuth,
            },
          }).catch(() => undefined);

          void invoke('set_audio_pipeline_config', {
            config: {
              enableDenoise:
                audioSettings.pipeline?.enableDenoise ??
                defaultSettings.audio.pipeline.enableDenoise,
              enableHighPass:
                audioSettings.pipeline?.enableHighPass ??
                defaultSettings.audio.pipeline.enableHighPass,
              enableTrimSilence:
                audioSettings.pipeline?.enableTrimSilence ??
                defaultSettings.audio.pipeline.enableTrimSilence,
              highPassHz:
                audioSettings.pipeline?.highPassHz ??
                defaultSettings.audio.pipeline.highPassHz,
              targetRms:
                audioSettings.pipeline?.targetRms === 0.16 ||
                audioSettings.pipeline?.targetRms === 0.2
                  ? 0.22
                  : (audioSettings.pipeline?.targetRms ??
                    defaultSettings.audio.pipeline.targetRms),
            },
          }).catch(() => undefined);

          set({
            settings: {
              audio: {
                ...audioSettings,
                selectedDevice,
                pipeline: {
                  ...defaultSettings.audio.pipeline,
                  ...audioSettings.pipeline,
                  enableTrimSilence:
                    audioSettings.pipeline?.enableTrimSilence ??
                    defaultSettings.audio.pipeline.enableTrimSilence,
                  targetRms:
                    audioSettings.pipeline?.targetRms === 0.16 ||
                    audioSettings.pipeline?.targetRms === 0.2
                      ? 0.22
                      : (audioSettings.pipeline?.targetRms ??
                        defaultSettings.audio.pipeline.targetRms),
                },
              },
              general: {
                launchOnStartup: autostartConfig.enabled,
                showGeckoBar: geckoBarConfig.enabled,
                showGeckoBarWhileRecording:
                  geckoBarConfig.showOnlyWhileRecording ?? false,
                hideGeckoOnFullscreen: geckoBarConfig.hideOnFullscreen ?? true,
              },
              privacy: privacySettings,
              personalization: personalizationSettings,
              dictation: {
                ...defaultSettings.dictation,
                ...dictationSettings,
              },
              features: featureSettings,
              models: {
                ...defaultSettings.models,
              },
              onboarding: {
                completed: onboardingCompleted,
              },
            },
            audioDevices,
            isInitialized: true,
            isLoading: false,
          });

          // Set initial volume
          if (audioSettings.notificationVolume) {
            await invoke('set_volume', {
              volume: audioSettings.notificationVolume,
            });
          }

        } catch (error) {
          log.error(error, '[Settings] Failed to initialize:');
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

      updateAudioPipeline: async (pipeline) => {
        const { settings } = get();
        const merged = { ...settings.audio.pipeline, ...pipeline };
        const newSettings = {
          ...settings,
          audio: { ...settings.audio, pipeline: merged },
        };
        set({ settings: newSettings });
        await saveWithMeta(settingsStore, 'audio.pipeline', merged);
        await invoke('set_audio_pipeline_config', {
          config: {
            enableDenoise: merged.enableDenoise,
            enableHighPass: merged.enableHighPass,
            enableTrimSilence:
              merged.enableTrimSilence ??
              defaultSettings.audio.pipeline.enableTrimSilence,
            highPassHz: merged.highPassHz ?? 80,
            targetRms: merged.targetRms ?? 0.22,
          },
        });
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
          showOnlyWhileRecording: settings.general.showGeckoBarWhileRecording,
        };
        await invoke('set_gecko_bar_config', { config });

        if (enabled) {
          await invoke('show_gecko_bar');
        } else {
          await invoke('hide_gecko_bar');
        }
      },

      updateShowGeckoBarWhileRecording: async (enabled) => {
        const { settings } = get();
        const newSettings = {
          ...settings,
          general: { ...settings.general, showGeckoBarWhileRecording: enabled },
        };
        set({ settings: newSettings });

        const config = {
          enabled: settings.general.showGeckoBar,
          hideOnFullscreen: settings.general.hideGeckoOnFullscreen,
          showOnlyWhileRecording: enabled,
        };
        await invoke('set_gecko_bar_config', { config });
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
          showOnlyWhileRecording: settings.general.showGeckoBarWhileRecording,
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

      updateDictationSetting: async (key, value) => {
        const { settings } = get();
        const oldValue = settings.dictation[key];
        const newSettings = {
          ...settings,
          dictation: { ...settings.dictation, [key]: value },
        };

        analytics.track('settings_changed', {
          category: 'dictation',
          setting_key: key,
          old_value: oldValue,
          new_value: value,
        });

        set({ settings: newSettings });
        await saveWithMeta(settingsStore, `dictation.${key}`, value);

        if (key === 'intentEnabled') {
          await invoke('set_intent_enabled', { enabled: value as boolean });
        }
      },

      updateFeatureSetting: async (key, value) => {
        const { settings } = get();
        const oldValue = settings.features[key];
        const newSettings = {
          ...settings,
          features: { ...settings.features, [key]: value },
        };

        analytics.track('settings_changed', {
          category: 'dictation',
          setting_key: `features.${key}`,
          old_value: oldValue,
          new_value: value,
        });

        set({ settings: newSettings });
        await saveWithMeta(settingsStore, `features.${key}`, value);

        await invoke('set_feature_flags', { flags: newSettings.features });
      },

      refreshAudioDevices: async () => {
        try {
          const audioDevices =
            await invoke<AudioDevice[]>('list_audio_devices');
          set({ audioDevices });
        } catch (error) {
          log.error(error, 'Failed to refresh audio devices:');
        }
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
          await dictationService.playEndSoundIfEnabled();
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
    pipeline: (await settingsStore.get<AudioSettings['pipeline']>(
      'audio.pipeline'
    )) ?? {
      enableDenoise: false,
      enableHighPass: true,
      enableTrimSilence: true,
      highPassHz: 80,
      targetRms: 0.22,
    },
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

async function loadDictationSettings(): Promise<SettingsV3DictationSettings> {
  return {
    intentEnabled:
      (await settingsStore.get<boolean>('dictation.intentEnabled')) ?? true,
    llmServerUrl:
      (await settingsStore.get<string>('dictation.llmServerUrl')) ??
      'http://127.0.0.1:8080',
    modeEngineOverrides:
      (await settingsStore.get<Record<string, string>>(
        'dictation.modeEngineOverrides'
      )) ?? {},
    toggleBatchShowLivePreview:
      (await settingsStore.get<boolean>(
        'dictation.toggleBatchShowLivePreview'
      )) ?? true,
    devContext:
      (await settingsStore.get<string>('dictation.devContext')) ??
      'TypeScript, React, Rust, Tauri, VoiceGecko, Cursor, coding agents, software engineering',
    forceDeveloperProfile:
      (await settingsStore.get<boolean>('dictation.forceDeveloperProfile')) ??
      false,
  };
}

async function loadFeatureSettings(): Promise<SettingsV3FeatureFlags> {
  return {
    moonshineFlow:
      (await settingsStore.get<boolean>('features.moonshineFlow')) ?? true,
    engineLab: (await settingsStore.get<boolean>('features.engineLab')) ?? true,
    cloudGpt4o:
      (await settingsStore.get<boolean>('features.cloudGpt4o')) ?? true,
    gpuWhisper:
      (await settingsStore.get<boolean>('features.gpuWhisper')) ?? true,
    localLlmPolish:
      (await settingsStore.get<boolean>('features.localLlmPolish')) ?? false,
    requireAuth:
      (await settingsStore.get<boolean>('features.requireAuth')) ?? false,
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
