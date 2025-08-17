import { log } from '@acme/observability/log';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { transcriptionService } from '~/services/transcription.service';
import { useEventStore } from '~/stores/event.store';
import { queryClient, trpcClient } from '~/trpc';
import type {
  AudioData,
  AudioLevelEvent,
  RecordingErrorEvent,
  RecordingStateChangedEvent,
  TranscriptionProgressEvent,
} from '~/types/events';

import { TranscriptionTracker } from './analytics/posthog-analytics';

let initialized = false;
let initializationId: string | null = null;

type InitializeOptions = {
  isGeckoBar?: boolean;
};

// Helper function to process cloud transcription
async function processCloudTranscription(
  audioData: AudioData,
  options: InitializeOptions
): Promise<void> {
  // Initialize transcription tracker for cloud transcription
  const audioDuration = audioData.samples.length / audioData.sample_rate;
  const transcriptionTracker = new TranscriptionTracker(
    'cloud',
    audioDuration,
    'whisper-1'
  );
  log.info('[TauriEvents] ☁️ Cloud transcription requested', {
    samplesLength: audioData.samples.length,
    sampleRate: audioData.sample_rate,
  });

  try {
    // Update UI to show transcribing state
    const store = useEventStore.getState();
    store.setTranscriptionProgress('Transcribing');

    // Call the cloud transcription API
    const result = await trpcClient.transcription.cloudTranscribe.mutate({
      audioData: Array.from(audioData.samples),
      sampleRate: audioData.sample_rate,
    });

    // Directly update the store instead of emitting an event that we'll catch ourselves
    const metadata = {
      duration_seconds: audioData.samples.length / audioData.sample_rate,
      model_used: result.modelUsed,
      sample_rate: audioData.sample_rate,
    };

    // Update transcription progress to complete
    store.setTranscriptionProgress('Complete', result.transcript, metadata);

    // Handle completion business logic only if not in gecko bar
    if (!options.isGeckoBar && result.transcript) {
      await handleTranscriptionCompletion(result.transcript);
    }
  } catch (error) {
    handleTranscriptionError(error, transcriptionTracker);
  }
}

// Helper function to handle transcription completion
async function handleTranscriptionCompletion(
  transcript: string
): Promise<void> {
  // For cloud transcriptions, the backend already saved the transcription
  // So we only need to handle clipboard and play notification sound
  await transcriptionService.handleCompletedTranscription(transcript);
  await transcriptionService.playEndSoundIfEnabled();

  // Invalidate queries to update UI
  log.info(
    '[TauriEvents] 🔄 Invalidating queries after cloud transcription...'
  );

  await queryClient.invalidateQueries({
    queryKey: ['transcription'],
  });

  await queryClient.invalidateQueries({
    queryKey: ['usage'],
  });

  log.info('[TauriEvents] ✅ Cache invalidation completed');
}

// Helper function to handle transcription errors
function handleTranscriptionError(
  error: unknown,
  transcriptionTracker: TranscriptionTracker
): void {
  log.error('[TauriEvents] Cloud transcription error:', error);

  // Track transcription failure
  transcriptionTracker.trackFailed(
    'cloud_api_error',
    error instanceof Error ? error.message : 'Unknown error'
  );

  // Update error state directly
  const store = useEventStore.getState();
  store.setTranscriptionProgress(
    'Error',
    error instanceof Error ? error.message : 'Cloud transcription failed'
  );

  toast.error('Cloud transcription failed', {
    description: error instanceof Error ? error.message : 'Unknown error',
  });
}

/**
 * Initialize Tauri event listeners that update the Zustand store
 * Should be called once during app startup
 */
export async function initializeTauriEvents(
  options: InitializeOptions = {}
): Promise<void> {
  const callerId = `${Date.now()}-${Math.random()}`;
  log.info(`[TauriEvents] Initialization attempt with ID: ${callerId}`);

  if (initialized) {
    log.info(
      `[TauriEvents] ⚠️ Already initialized by ${initializationId}, skipping (attempted by ${callerId})...`
    );
    return;
  }

  initialized = true;
  initializationId = callerId;
  log.info(
    `[TauriEvents] 🚀 Initializing Tauri event listeners (ID: ${callerId})...`
  );

  try {
    // Listen for transcription progress events (always needed for UI state)
    await listen('transcription-progress', (event) => {
      const payload = event.payload as TranscriptionProgressEvent;
      log.info('[TauriEvents] 📝 Transcription progress:', payload);

      const store = useEventStore.getState();
      const metadata = {
        duration_seconds: payload.duration_seconds,
        model_used: payload.model_used,
        sample_rate: payload.sample_rate,
      };

      store.setTranscriptionProgress(payload.status, payload.data, metadata);

      // Only handle completion business logic in main window
      if (!options.isGeckoBar && payload.status === 'Complete') {
        log.info(
          '[TauriEvents] Handling transcription completion in main window'
        );
        store.handleTranscriptionComplete(payload.data ?? '', metadata);
      }
    });

    // Listen for recording state changes
    await listen('recording-state-changed', (event) => {
      const payload = event.payload as RecordingStateChangedEvent;
      log.info('[TauriEvents] 🎙️ Recording state changed:', payload);

      useEventStore.getState().setRecordingStatus(payload);
    });

    // Listen for cloud transcription requests
    await listen('cloud-transcription-requested', (event) => {
      const handleCloudTranscription = async () => {
        const audioData = event.payload as AudioData;
        await processCloudTranscription(audioData, options);
      };

      // Execute without awaiting to avoid blocking the event listener
      handleCloudTranscription().catch((error) => {
        log.error('[TauriEvents] Unhandled cloud transcription error:', error);
      });
    });

    // Listen for recording errors
    await listen('recording-error', (event) => {
      const payload = event.payload as RecordingErrorEvent;
      log.info('[TauriEvents] ❌ Recording error:', payload);

      useEventStore.getState().setRecordingError(payload);
      toast.error('Recording error', { description: payload });
    });

    // Listen for audio level events
    await listen('audio-level', (event) => {
      const payload = event.payload as AudioLevelEvent;
      // Emit to any components that need real-time audio levels
      window.dispatchEvent(new CustomEvent('audio-level', { detail: payload }));
    });

    log.info('[TauriEvents] ✅ Tauri event listeners initialized successfully');
  } catch (error) {
    log.error(
      '[TauriEvents] ❌ Failed to initialize Tauri event listeners:',
      error
    );
    initialized = false;
    throw error;
  }
}
