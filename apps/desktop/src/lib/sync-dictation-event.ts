import type { DictationEvent } from '~/types/dictation-events';
import { useDictationStore } from '~/stores/dictation.store';
import { useEventStore } from '~/stores/event.store';

type SyncOptions = {
  isGeckoBar?: boolean;
};

export function syncDictationEventToStores(
  payload: DictationEvent,
  options: SyncOptions = {}
): void {
  useDictationStore.getState().handleEvent(payload);

  const store = useEventStore.getState();

  switch (payload.type) {
    case 'sessionStarted':
      store.setRecordingStatus('recording');
      break;
    case 'partialTranscript':
      store.setDictationProgress('Transcribing', payload.text);
      break;
    case 'finalTranscript':
      store.setDictationProgress('Transcribing', payload.text, {
        model_used: payload.engineId,
      });
      break;
    case 'sessionComplete':
      store.setDictationProgress('Complete', payload.text, {
        model_used: useDictationStore.getState().lastEngineId ?? undefined,
      });
      if (!options.isGeckoBar && payload.text) {
        store.setRecordingStatus('idle');
      }
      break;
    case 'sessionError':
      store.setDictationProgress('Error', payload.message);
      store.setRecordingStatus('idle');
      break;
    case 'phaseChanged':
      if (payload.phase === 'recording') {
        store.setRecordingStatus('recording');
      } else if (payload.phase === 'transcribing' || payload.phase === 'formatting') {
        store.setRecordingStatus('processing');
      }
      break;
    default:
      break;
  }
}
