import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';

export function useAudioHelpers() {
  const playTestSound = async () => {
    try {
      await invoke('play_test_sound');
    } catch (error) {
      log.error('Failed to play test sound:', error);
    }
  };

  return {
    playTestSound,
  };
}
