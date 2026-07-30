import type { MigrationV2ToV3 } from '../types';
import type {
  SettingsV2VersionedSettings,
  SettingsV3VersionedSettings,
} from '../versioned-schemas';

export const migrationV2ToV3: MigrationV2ToV3 = {
  version: 3,
  description: 'Add v2 dictation settings (modes, intent, engine overrides)',

  up: (v2Settings): SettingsV3VersionedSettings => {
    return {
      ...v2Settings,
      _meta: {
        version: 3,
        timestamp: Date.now(),
        appVersion: v2Settings._meta.appVersion,
      },
      dictation: {
        intentEnabled: true,
        llmServerUrl: 'http://127.0.0.1:8080',
        modeEngineOverrides: {},
        toggleBatchShowLivePreview: false,
        devContext:
          'TypeScript, React, Rust, Tauri, VoiceGecko, Cursor, coding agents, software engineering',
        forceDeveloperProfile: false,
      },
      features: {
        moonshineFlow: true,
        engineLab: true,
        cloudGpt4o: true,
        gpuWhisper: true,
        localLlmPolish: true,
        requireAuth: false,
      },
    };
  },
};
