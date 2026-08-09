import { listen } from '@tauri-apps/api/event';
import type { DictationEvent } from '~/types/dictation-events';
import { DICTATION_EVENT_CHANNEL } from '~/types/dictation-events';
import { initializeDictationEvents } from '~/stores/dictation.store';
import { syncDictationEventToStores } from '~/lib/sync-dictation-event';

let geckoBarBridgeInitialized = false;

export async function initializeGeckoBarDictationBridge(): Promise<void> {
  if (geckoBarBridgeInitialized) {
    return;
  }
  geckoBarBridgeInitialized = true;

  await initializeDictationEvents();

  await listen<DictationEvent>(DICTATION_EVENT_CHANNEL, (event) => {
    syncDictationEventToStores(event.payload, { isGeckoBar: true });
  });
}
