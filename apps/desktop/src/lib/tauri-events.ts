import { log } from '@acme/observability/log';
import { emit, listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { dictationService } from '~/services/dictation.service';
import { useEventStore } from '~/stores/event.store';
import { queryClient, trpcClient } from '~/trpc';
import type {
  AudioData,
  AudioLevelEvent,
  DictationProgressEvent,
  RecordingErrorEvent,
  RecordingStateChangedEvent,
} from '~/types/events';

import { DictationTracker } from './analytics/posthog-analytics';
import { performanceTracker } from './performance-tracker';

let initialized = false;
let initializationId: string | null = null;

type InitializeOptions = {
  isGeckoBar?: boolean;
};

// Helper function to process cloud dictation
async function processCloudDictation(
  audioData: AudioData,
  options: InitializeOptions
): Promise<void> {
  // Initialize dictation tracker for cloud dictation
  const audioDuration = audioData.samples.length / audioData.sample_rate;
  const dictationTracker = new DictationTracker(
    'cloud',
    audioDuration,
    'whisper-1'
  );
  log.info('[TauriEvents] ☁️ Cloud dictation requested', {
    samplesLength: audioData.samples.length,
    sampleRate: audioData.sample_rate,
  });

  try {
    // Update UI to show transcribing state
    const store = useEventStore.getState();
    store.setDictationProgress('Transcribing');

    // Broadcast progress to all windows (e.g., Gecko Bar)
    await emit('dictation-progress', {
      status: 'Transcribing',
      // Mark source so main-window listener can skip duplicate completion handling
      // for cloud flows.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error allow extra field for cross-window event consumers
      source: 'cloud',
      duration_seconds: audioData.samples.length / audioData.sample_rate,
      model_used: 'whisper-1',
      sample_rate: audioData.sample_rate,
    } satisfies DictationProgressEvent);

    // Call the cloud dictation API
    const result = await trpcClient.dictation.cloudTranscribe.mutate({
      audioData: Array.from(audioData.samples),
      sampleRate: audioData.sample_rate,
    });

    // Directly update the store instead of emitting an event that we'll catch ourselves
    const metadata = {
      duration_seconds: audioData.samples.length / audioData.sample_rate,
      model_used: result.modelUsed,
      sample_rate: audioData.sample_rate,
    };

    // Update dictation progress to complete
    store.setDictationProgress('Complete', result.transcript, metadata);

    // Broadcast completion to all windows (e.g., Gecko Bar)
    await emit('dictation-progress', {
      status: 'Complete',
      data: result.transcript,
      duration_seconds: metadata.duration_seconds,
      model_used: metadata.model_used,
      sample_rate: metadata.sample_rate,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error allow extra field for cross-window event consumers
      source: 'cloud',
    } satisfies DictationProgressEvent);

    // Handle completion business logic only if not in gecko bar
    if (!options.isGeckoBar && result.transcript) {
      await handleDictationCompletion(result.transcript);
    }
  } catch (error) {
    handleDictationError(error, dictationTracker);
  }
}

// Helper function to handle dictation completion
async function handleDictationCompletion(transcript: string): Promise<void> {
  // For cloud dictations, the backend already saved the dictation
  // So we only need to handle clipboard and play notification sound
  await dictationService.handleCompletedDictation(transcript);
  await dictationService.playEndSoundIfEnabled();

  // Invalidate queries to update UI
  log.info('[TauriEvents] 🔄 Invalidating queries after cloud dictation...');

  await queryClient.invalidateQueries({
    queryKey: ['dictation'],
  });

  await queryClient.invalidateQueries({
    queryKey: ['usage'],
  });

  log.info('[TauriEvents] ✅ Cache invalidation completed');
}

// Helper function to handle dictation errors
function handleDictationError(
  error: unknown,
  dictationTracker: DictationTracker
): void {
  log.error('[TauriEvents] Cloud dictation error:', error);

  // Track dictation failure
  dictationTracker.trackFailed(
    'cloud_api_error',
    error instanceof Error ? error.message : 'Unknown error'
  );

  // Update error state directly
  const store = useEventStore.getState();
  store.setDictationProgress(
    'Error',
    error instanceof Error ? error.message : 'Cloud dictation failed'
  );

  // Broadcast error to all windows (e.g., Gecko Bar)
  emit('dictation-progress', {
    status: 'Error',
    data: error instanceof Error ? error.message : 'Cloud dictation failed',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error allow extra field for cross-window event consumers
    source: 'cloud',
  } satisfies DictationProgressEvent).catch(() => {
    // Non-fatal if emit fails
  });

  toast.error('Cloud dictation failed', {
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
    // Listen for dictation progress events (always needed for UI state)
    await listen('dictation-progress', (event) => {
      const payload = event.payload as DictationProgressEvent;
      log.info('[TauriEvents] 📝 Dictation progress:', payload);

      const store = useEventStore.getState();
      const metadata = {
        duration_seconds: payload.duration_seconds,
        model_used: payload.model_used,
        sample_rate: payload.sample_rate,
      };

      store.setDictationProgress(payload.status, payload.data, metadata);

      // Mark dictation completion for performance tracking
      if (payload.status === 'Complete') {
        performanceTracker.markPhase('dictationCompleteTime');
      }

      // Only handle completion business logic in main window
      if (!options.isGeckoBar && payload.status === 'Complete') {
        const source = (payload as unknown as { source?: string }).source;
        if (source === 'cloud') {
          // For cloud flows, completion handling (clipboard, sounds, cache) is
          // already executed in processCloudDictation. Skip here to avoid
          // duplicate operations and duplicate DB saves.
          log.info(
            '[TauriEvents] Skipping main-window completion handling for cloud source'
          );
          return;
        }
        log.info('[TauriEvents] Handling dictation completion in main window', {
          isGeckoBar: options.isGeckoBar,
          callerId: initializationId,
        });
        store.handleDictationComplete(payload.data ?? '', metadata);
      } else if (payload.status === 'Complete') {
        log.info(
          '[TauriEvents] Skipping dictation completion (gecko bar window)',
          { isGeckoBar: options.isGeckoBar, callerId: initializationId }
        );
      }
    });

    // Listen for recording state changes
    await listen('recording-state-changed', (event) => {
      const payload = event.payload as RecordingStateChangedEvent;
      log.info('[TauriEvents] 🎙️ Recording state changed:', payload);

      useEventStore.getState().setRecordingStatus(payload);
    });

    // Listen for cloud dictation requests
    await listen('cloud-dictation-requested', (event) => {
      const handleCloudDictation = async () => {
        const audioData = event.payload as AudioData;
        await processCloudDictation(audioData, options);
      };

      // Execute without awaiting to avoid blocking the event listener
      handleCloudDictation().catch((error) => {
        log.error('[TauriEvents] Unhandled cloud dictation error:', error);
      });
    });

    // Listen for recording errors
    await listen('recording-error', (event) => {
      const payload = event.payload as RecordingErrorEvent;
      log.info('[TauriEvents] ❌ Recording error:', payload);

      useEventStore.getState().setRecordingError(payload);
      toast.error('Recording error', { description: payload });
    });

    // Listen for gecko bar recording requests (only in main window)
    if (!options.isGeckoBar) {
      await listen('gecko-bar-recording-request', (event) => {
        const payload = event.payload as {
          action: 'toggle' | 'cancel' | 'finish';
        };
        log.info(
          '[TauriEvents] 🎛️ Gecko bar recording request:',
          payload.action
        );

        // Import recording service dynamically to handle the request
        import('~/services/recording.service')
          .then(({ recordingService }) => {
            // Handle the request using the recording service (business logic in main window only)
            switch (payload.action) {
              case 'toggle':
                recordingService
                  .toggleRecording({ isKeyboardShortcut: false })
                  .catch((error) => {
                    log.error(
                      '[TauriEvents] Failed to toggle recording from gecko bar:',
                      error
                    );
                  });
                break;
              case 'cancel':
                recordingService.cancelRecording().catch((error) => {
                  log.error(
                    '[TauriEvents] Failed to cancel recording from gecko bar:',
                    error
                  );
                });
                break;
              case 'finish':
                recordingService.toggleRecording().catch((error) => {
                  log.error(
                    '[TauriEvents] Failed to finish recording from gecko bar:',
                    error
                  );
                });
                break;
              default:
                log.warn(
                  '[TauriEvents] Unknown gecko bar action:',
                  payload.action
                );
            }
          })
          .catch((error) => {
            log.error(
              '[TauriEvents] Failed to import recording service:',
              error
            );
          });
      });
    }

    // Listen for audio level events
    await listen('audio-level', (event) => {
      const payload = event.payload as AudioLevelEvent;
      // Emit to any components that need real-time audio levels
      window.dispatchEvent(new CustomEvent('audio-level', { detail: payload }));
    });

    // Listen for performance tracking events
    await listen('end-to-end-performance-start', (event) => {
      // This is the true start - when audio processing begins in Rust
      const audioMetadata = event.payload as {
        samplesLength: number;
        durationSeconds: number;
        sampleRate: number;
      };

      log.info(
        '[PERF] Starting TRUE end-to-end performance tracking from audio processing start'
      );
      performanceTracker.startSession(audioMetadata);
    });

    await listen('audio-processing-complete', () => {
      // Only mark if we have an active session
      if (performanceTracker.isSessionActive()) {
        performanceTracker.markPhase('audioProcessingTime');
      }
    });

    await listen('dictation-start', () => {
      // Only mark if we have an active session
      if (performanceTracker.isSessionActive()) {
        performanceTracker.markPhase('dictationStartTime');
      }
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
