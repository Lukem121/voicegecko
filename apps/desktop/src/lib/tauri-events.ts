import { log } from '@acme/observability/log';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { showMicrophoneNotFoundNotification } from '~/lib/gecko-bar-notifications';
import { syncDictationEventToStores } from '~/lib/sync-dictation-event';
import { dictationService } from '~/services/dictation.service';
import { useDictationStore } from '~/stores/dictation.store';
import { useEventStore } from '~/stores/event.store';
import type { DictationEvent } from '~/types/dictation-events';
import { DICTATION_EVENT_CHANNEL } from '~/types/dictation-events';
import type {
  AudioLevelEvent,
  RecordingErrorEvent,
  RecordingStateChangedEvent,
} from '~/types/events';

import { performanceTracker } from './performance-tracker';

let initialized = false;
let initializationId: string | null = null;

const DEVICE_UNAVAILABLE_PATTERN =
  /not found|no default.*(audio|input) device|no default input device|no longer available|unplugged/i;

type InitializeOptions = {
  isGeckoBar?: boolean;
};

async function handleV2BackgroundSave(
  transcript: string,
  metadata?: { model_used?: string }
): Promise<void> {
  const { useConnectivityStore } = await import('~/stores/connectivity.store');
  const connectivityState = useConnectivityStore.getState();

  if (!connectivityState.canSaveDictations) {
    return;
  }

  const { createDictation } = await import('~/lib/dictation-mutations');
  const { getVersion } = await import('@tauri-apps/api/app');

  let appVersion: string | undefined;
  try {
    appVersion = await getVersion();
  } catch {
    appVersion = undefined;
  }

  const content = transcript.trim() || 'Audio is silent.';
  await createDictation({
    content,
    status: content === 'Audio is silent.' ? 'silent' : 'normal',
    modelUsed: metadata?.model_used,
    appVersion,
  }).catch((error) => {
    log.warn(error, '[TauriEvents] v2 background save failed');
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
      `[TauriEvents] Already initialized by ${initializationId}, skipping (attempted by ${callerId})...`
    );
    return;
  }

  initialized = true;
  initializationId = callerId;
  log.info(
    `[TauriEvents] Initializing Tauri event listeners (ID: ${callerId})...`
  );

  try {
    await listen<DictationEvent>(DICTATION_EVENT_CHANNEL, (event) => {
      const payload = event.payload;
      log.info('[TauriEvents] v2 dictation event:', payload);

      syncDictationEventToStores(payload, { isGeckoBar: options.isGeckoBar });

      if (payload.type === 'phaseChanged' && payload.phase === 'transcribing') {
        if (performanceTracker.isSessionActive()) {
          performanceTracker.markPhase('dictationStartTime');
        }
      }

      if (payload.type === 'sessionComplete') {
        performanceTracker.markPhase('dictationCompleteTime');

        if (!options.isGeckoBar) {
          dictationService.setLastDictation(payload.text);
          void dictationService.playEndSoundIfEnabled();
          void handleV2BackgroundSave(payload.text, {
            model_used: useDictationStore.getState().lastEngineId ?? undefined,
          });
        }
      }
    });

    await listen('recording-state-changed', (event) => {
      const payload = event.payload as RecordingStateChangedEvent;
      log.info('[TauriEvents] Recording state changed:', payload);

      useEventStore.getState().setRecordingStatus(payload);
    });

    await listen('recording-error', (event) => {
      const payload = event.payload as RecordingErrorEvent;
      log.info(payload, '[TauriEvents] Recording error:');

      useEventStore.getState().setRecordingError(payload);

      const isDeviceUnavailable =
        typeof payload === 'string' && DEVICE_UNAVAILABLE_PATTERN.test(payload);

      if (isDeviceUnavailable) {
        showMicrophoneNotFoundNotification();
      } else {
        toast.error('Recording error', { description: payload });
      }
    });

    await listen('microphone-test-error', (event) => {
      const payload = event.payload as string;
      log.info(payload, '[TauriEvents] Microphone test error:');

      if (DEVICE_UNAVAILABLE_PATTERN.test(payload)) {
        showMicrophoneNotFoundNotification();
      }
    });

    if (!options.isGeckoBar) {
      await listen('gecko-bar-navigation', (event) => {
        const payload = event.payload as { to: string };
        import('~/lib/router')
          .then(async ({ navigate }) => {
            try {
              const { getCurrentWebviewWindow } = await import(
                '@tauri-apps/api/webviewWindow'
              );
              const main = getCurrentWebviewWindow();
              await main.show();
              await main.unminimize();
              await main.setFocus();
            } catch {
              // non-fatal
            }
            await navigate({ to: payload.to });
          })
          .catch((error) => {
            log.error(
              error,
              '[TauriEvents] Failed to navigate from gecko bar:'
            );
          });
      });
      await listen('gecko-bar-recording-request', (event) => {
        const payload = event.payload as {
          action: 'toggle' | 'cancel' | 'finish';
        };
        log.info(
          '[TauriEvents] Gecko bar recording request:',
          payload.action
        );

        import('~/services/recording.service')
          .then(({ recordingService }) => {
            switch (payload.action) {
              case 'toggle':
                recordingService
                  .toggleRecording({ isKeyboardShortcut: false })
                  .catch((error) => {
                    log.error(
                      error,
                      '[TauriEvents] Failed to toggle recording from gecko bar:'
                    );
                  });
                break;
              case 'cancel':
                recordingService.cancelRecording().catch((error) => {
                  log.error(
                    error,
                    '[TauriEvents] Failed to cancel recording from gecko bar:'
                  );
                });
                break;
              case 'finish':
                recordingService.toggleRecording().catch((error) => {
                  log.error(
                    error,
                    '[TauriEvents] Failed to finish recording from gecko bar:'
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
              error,
              '[TauriEvents] Failed to import recording service:'
            );
          });
      });
    }

    await listen('audio-level', (event) => {
      const payload = event.payload as AudioLevelEvent;
      window.dispatchEvent(new CustomEvent('audio-level', { detail: payload }));
    });

    await listen('end-to-end-performance-start', (event) => {
      const audioMetadata = event.payload as {
        samplesLength: number;
        durationSeconds: number;
        sampleRate: number;
      };

      log.info(
        '[PERF] Starting end-to-end performance tracking from audio processing start'
      );
      performanceTracker.startSession(audioMetadata);
    });

    await listen('audio-processing-complete', () => {
      if (performanceTracker.isSessionActive()) {
        performanceTracker.markPhase('audioProcessingTime');
      }
    });

    log.info('[TauriEvents] Tauri event listeners initialized successfully');
  } catch (error) {
    log.error(
      error,
      '[TauriEvents] Failed to initialize Tauri event listeners:'
    );
    initialized = false;
    throw error;
  }
}
