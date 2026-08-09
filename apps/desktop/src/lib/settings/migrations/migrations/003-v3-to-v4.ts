import type { MigrationV3ToV4 } from '../types';
import type {
  SettingsV3VersionedSettings,
  SettingsV4VersionedSettings,
} from '../versioned-schemas';

export const migrationV3ToV4: MigrationV3ToV4 = {
  version: 4,
  description: 'Enable live transcription preview by default',

  up: (v3Settings): SettingsV4VersionedSettings => {
    return {
      ...v3Settings,
      _meta: {
        version: 4,
        timestamp: Date.now(),
        appVersion: v3Settings._meta.appVersion,
      },
      dictation: {
        ...v3Settings.dictation,
        toggleBatchShowLivePreview: true,
      },
    };
  },
};
