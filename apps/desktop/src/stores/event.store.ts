import { log } from '@acme/observability/log';
import { getVersion } from '@tauri-apps/api/app';
import { toast } from 'sonner';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { isNetworkError } from '~/hooks/auth';
import analytics from '~/lib/analytics/posthog-analytics';
import { createDictation } from '~/lib/dictation-mutations';
import { dictationService } from '~/services/dictation.service';
import { useConnectivityStore } from '~/stores/connectivity.store';

export type EventState = {
  // Recording state
  recordingStatus: 'idle' | 'recording' | 'processing' | 'error';
  recordingError: string | null;

  // Dictation state
  dictationStatus:
    | 'idle'
    | 'starting'
    | 'loading_model'
    | 'transcribing'
    | 'complete'
    | 'error';
  transcript: string | null;
  dictationError: string | null;
  dictationMetadata: {
    duration_seconds?: number;
    model_used?: string;
    sample_rate?: number;
  } | null;

  // Actions (called by Tauri event handlers)
  setRecordingStatus: (
    status: 'idle' | 'recording' | 'processing' | 'error'
  ) => void;
  setRecordingError: (error: string) => void;
  setDictationProgress: (
    status: string,
    data?: string,
    metadata?: {
      duration_seconds?: number;
      model_used?: string;
      sample_rate?: number;
    }
  ) => void;
  handleDictationComplete: (
    transcript: string,
    metadata?: {
      duration_seconds?: number;
      model_used?: string;
      sample_rate?: number;
    }
  ) => Promise<void>;

  // Reset functions
  resetDictationState: () => void;

  // Selectors (computed values)
  isRecording: () => boolean;
  isTranscribing: () => boolean;
};

export const useEventStore = create<EventState>()(
  devtools(
    (set, get) => ({
      // Initial state
      recordingStatus: 'idle',
      recordingError: null,
      dictationStatus: 'idle',
      transcript: null,
      dictationError: null,
      dictationMetadata: null,

      // Recording actions
      setRecordingStatus: (status) => {
        const currentStatus = get().recordingStatus;
        log.info(
          '[EventStore] 🎙️ Recording status changed:',
          currentStatus,
          '→',
          status
        );
        set({ recordingStatus: status });

        // Clear error when status changes successfully
        if (status !== 'error') {
          set({ recordingError: null });
        }

        // Reset dictation state when starting a new recording
        if (status === 'recording') {
          set({
            dictationStatus: 'idle',
            transcript: null,
            dictationError: null,
            dictationMetadata: null,
          });
        }
      },

      setRecordingError: (error) => {
        log.info(error, '[EventStore] ❌ Recording error:');
        set({
          recordingStatus: 'error',
          recordingError: error,
        });
      },

      // Dictation actions
      setDictationProgress: (status, data, metadata) => {
        log.info(status, data, metadata, '[EventStore] Dictation progress:');

        switch (status) {
          case 'Starting':
            set({ dictationStatus: 'starting' });
            break;
          case 'LoadingModel':
            set({ dictationStatus: 'loading_model' });
            break;
          case 'Transcribing':
            set({ dictationStatus: 'transcribing' });
            break;
          case 'Complete':
            set({
              dictationStatus: 'complete',
              transcript: data ?? null,
              dictationError: null,
              dictationMetadata: metadata ?? null,
              // Also set recording status to idle when dictation completes
              recordingStatus: 'idle',
            });
            break;
          case 'Error':
            set({
              dictationStatus: 'error',
              transcript: null,
              dictationError: data ?? 'Unknown error',
              dictationMetadata: null,
              // Also set recording status to idle on error
              recordingStatus: 'idle',
            });
            break;
          default:
            break;
        }
      },

      handleDictationComplete: async (transcript: string, metadata) => {
        log.info(
          '[EventStore] 🔊 handleDictationComplete called (main window only)',
          {
            transcript: transcript.substring(0, 50),
            windowLabel:
              typeof window !== 'undefined' ? window.location.href : 'unknown',
          }
        );

        const status: 'silent' | 'normal' =
          !transcript.trim() ||
          (metadata?.duration_seconds && metadata.duration_seconds < 1)
            ? 'silent'
            : 'normal';
        const content = status === 'silent' ? 'Audio is silent.' : transcript;

        let appVersion: string | undefined;
        try {
          appVersion = await getVersion();
        } catch (error) {
          log.warn('Failed to get app version', { error });
        }

        const dictationData = {
          content,
          status,
          durationSeconds:
            Number.isFinite(metadata?.duration_seconds) &&
            metadata?.duration_seconds !== undefined
              ? Math.trunc(metadata.duration_seconds)
              : undefined,
          modelUsed: metadata?.model_used,
          sampleRate: metadata?.sample_rate,
          appVersion,
        };

        // Immediate user feedback — always paste locally (offline-first)
        try {
          await dictationService.handleCompletedDictation(transcript);
          await dictationService.playEndSoundIfEnabled();
        } catch (error) {
          log.error(error, '[EventStore] Failed user feedback operations:');
        }

        // Background cloud save when online (non-blocking)
        const connectivityState = useConnectivityStore.getState();
        if (connectivityState.canSaveDictations) {
          createDictation(dictationData)
            .then(() => {})
            .catch((error) => {
              if (isNetworkError(error)) {
                connectivityState.checkConnectivity();
              } else {
                log.error(error, 'Background save error:');
              }
            });
        }
      },

      // Reset functions
      resetDictationState: () => {
        log.info('[EventStore] 🔄 Resetting dictation state');
        set({
          dictationStatus: 'idle',
          transcript: null,
          dictationError: null,
          dictationMetadata: null,
        });
      },

      // Selectors
      isRecording: () => get().recordingStatus === 'recording',
      isTranscribing: () => {
        const status = get().dictationStatus;
        return status === 'loading_model' || status === 'transcribing';
      },
    }),
    {
      name: 'event-store',
    }
  )
);
