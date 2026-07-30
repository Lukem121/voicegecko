import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

import {
  isSpeechModelsReady,
} from '~/lib/model-bootstrap';
import {
  showMicrophoneNotFoundNotification,
} from '~/lib/gecko-bar-notifications';
import { performanceTracker } from '~/lib/performance-tracker';
import { dictionaryService } from '~/services/dictionary.service';
import { useEventStore } from '~/stores/event.store';
import { useSettingsStore } from '~/stores/settings.store';
import { queryClient, trpc, trpcClient } from '~/trpc';

const DEVICE_UNAVAILABLE_PATTERN =
  /not found|no default.*(audio|input) device|no default input device|no longer available|unplugged/i;

export type RecordingOptions = {
  device?: string;
  playStartSound?: boolean;
  playEndSound?: boolean;
  isKeyboardShortcut?: boolean;
  mode?: string;
};

export class RecordingService {
  private static instance: RecordingService | undefined;

  private isToggling = false;
  private isPushToTalkActive = false;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  static getInstance(): RecordingService {
    RecordingService.instance ??= new RecordingService();
    return RecordingService.instance;
  }

  /**
   * Toggle recording on/off
   */
  async toggleRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isToggling) {
      return;
    }

    this.isToggling = true;

    try {
      const { recordingStatus } = useEventStore.getState();

      if (recordingStatus === 'idle') {
        await this.startRecording(options);
      } else if (recordingStatus === 'recording') {
        await this.stopRecording(options);
      } else if (recordingStatus === 'processing') {
        // Recording is processing, ignoring toggle
      } else {
        // Recording in error state, attempting to start...
        await this.startRecording(options);
      }
    } finally {
      setTimeout(() => {
        this.isToggling = false;
      }, 200);
    }
  }

  /**
   * Start push-to-talk recording
   */
  async startPushToTalk(options: RecordingOptions = {}): Promise<void> {
    if (this.isPushToTalkActive) {
      return;
    }

    this.isPushToTalkActive = true;
    const { recordingStatus } = useEventStore.getState();

    if (recordingStatus === 'idle') {
      await this.startRecording({
        ...options,
        mode: options.mode ?? 'ptt_batch',
      });
    }
  }

  /**
   * Stop push-to-talk recording
   */
  async stopPushToTalk(options: RecordingOptions = {}): Promise<void> {
    if (!this.isPushToTalkActive) {
      return;
    }

    this.isPushToTalkActive = false;
    const { recordingStatus } = useEventStore.getState();

    if (recordingStatus === 'recording') {
      await this.stopRecording(options);
    }
  }

  /**
   * Release push-to-talk recording
   */
  async releasePushToTalk(options: RecordingOptions = {}): Promise<void> {
    if (!this.isPushToTalkActive) {
      return;
    }

    this.isPushToTalkActive = false;
    const { recordingStatus } = useEventStore.getState();

    if (recordingStatus === 'recording') {
      await this.stopRecording(options);
    } else {
      // If recording was somehow stopped already, still unmute system audio
      const { settings } = useSettingsStore.getState();
      if (settings.audio.muteSystemAudio) {
        try {
          await invoke('unmute_system_audio');
        } catch (error) {
          log.warn('Failed to unmute system audio:', error);
        }
      }
    }
  }

  /**
   * Start recording with proper error handling and notifications
   */
  private async startRecording(options: RecordingOptions): Promise<void> {
    const mode = options.mode ?? 'toggle_batch';

    const modelsReady = await isSpeechModelsReady();
    if (!modelsReady && mode !== 'accuracy_cloud') {
      toast.info('Speech models are still setting up', {
        description:
          'First launch downloads models in the background. Keep VoiceGecko open and try again shortly.',
        duration: 8000,
      });
      return;
    }

    try {
      // v2: dictation works offline — usage checks are advisory only
      if (options.isKeyboardShortcut) {
        this.performAsyncUsageCheck();
      }

      // v2: start dictation session before audio capture
      void dictionaryService.getDictionaryPrompt().catch(() => undefined);

      try {
        const { settings } = useSettingsStore.getState();
        const engineOverride = settings.dictation.modeEngineOverrides[mode];

        await invoke('start_dictation_session', {
          request: {
            mode,
            engineId: engineOverride,
            showLivePreview:
              mode === 'toggle_batch' || mode === 'ptt_batch'
                ? settings.dictation.toggleBatchShowLivePreview
                : undefined,
            audioPipeline: {
              enableDenoise: settings.audio.pipeline.enableDenoise,
              enableHighPass: settings.audio.pipeline.enableHighPass,
              enableTrimSilence:
                settings.audio.pipeline.enableTrimSilence ?? true,
              highPassHz: settings.audio.pipeline.highPassHz ?? 80,
              targetRms: settings.audio.pipeline.targetRms ?? 0.22,
            },
            devContext: settings.dictation.devContext,
            forceDeveloperProfile: settings.dictation.forceDeveloperProfile,
          },
        });
      } catch (error) {
        log.warn('Failed to start dictation session:', error);
      }

      const { settings } = useSettingsStore.getState();
      const deviceName = options.device ?? settings.audio.selectedDevice?.name;

      // Mute system audio if enabled (before capture)
      if (settings.audio.muteSystemAudio) {
        try {
          await invoke('mute_system_audio');
        } catch (error) {
          log.warn('Failed to mute system audio:', error);
        }
      }

      await invoke('start_recording', { device: deviceName });

      // Play start sound after mic is open so the first word is not clipped
      if (options.playStartSound ?? this.shouldPlayStartSound()) {
        await this.playNotificationSound('Start');
      }
    } catch (error) {
      log.error(error, 'Failed to start recording:');

      const errorMessage =
        typeof error === 'string'
          ? error
          : (error instanceof Error ? error.message : String(error));
      const isDeviceUnavailable = DEVICE_UNAVAILABLE_PATTERN.test(errorMessage);

      if (isDeviceUnavailable) {
        useEventStore.getState().setRecordingError(errorMessage);
        await showMicrophoneNotFoundNotification();
        return;
      }

      throw error;
    }
  }

  /**
   * Stop recording with proper error handling and dictation
   */
  private async stopRecording(options: RecordingOptions): Promise<void> {
    try {
      // Set processing state immediately to avoid UI gap
      useEventStore.getState().setRecordingStatus('processing');

      // OPTIMIZATION: Audio processing now starts internal dictation directly in Rust
      // This eliminates the 267ms data transfer overhead by keeping audio processing and
      // dictation entirely in Rust without round-trip through frontend
      const stopMeta = await invoke<{
        durationSecs: number;
        sampleRate: number;
        sampleCount: number;
      }>('stop_recording');

      log.info('[PERF] Capture stopped; dictation started in Rust', {
        durationSecs: stopMeta.durationSecs,
        sampleCount: stopMeta.sampleCount,
        sampleRate: stopMeta.sampleRate,
      });

      // Mark when recording is complete - dictation already started internally
      performanceTracker.markPhase('recordingStopTime');

      if (options.playEndSound ?? this.shouldPlayEndSound()) {
        await this.playNotificationSound('End');
      }

      // Unmute system audio if it was muted
      const { settings } = useSettingsStore.getState();
      if (settings.audio.muteSystemAudio) {
        try {
          await invoke('unmute_system_audio');
        } catch (error) {
          log.warn('Failed to unmute system audio:', error);
          // Don't fail dictation if unmuting fails
        }
      }

      // OPTIMIZATION: Skip frontend dictation call - it's already happening internally in Rust
      // This saves ~267ms of data serialization and transfer overhead
      log.info(
        '[PERF] ⚡ Skipping frontend dictation call - already started internally in Rust'
      );
    } catch (error) {
      log.error(error, 'Failed to stop recording:');

      throw error;
    }
  }

  /**
   * Cancel recording without dictation - discards audio completely
   */
  async cancelRecording(_options: RecordingOptions = {}): Promise<void> {
    try {
      log.info('[RecordingService] Canceling recording...');

      await invoke('cancel_recording');
      await invoke('cancel_dictation_session').catch(() => undefined);

      // Unmute system audio if it was muted
      const { settings } = useSettingsStore.getState();
      if (settings.audio.muteSystemAudio) {
        try {
          await invoke('unmute_system_audio');
        } catch (error) {
          log.warn('Failed to unmute system audio:', error);
        }
      }

      log.info('[RecordingService] Recording canceled successfully');
    } catch (error) {
      log.error(error, 'Failed to cancel recording:');
      throw error;
    }
  }

  /**
   * Play notification sound with proper error handling
   */
  async playNotificationSound(variant: 'Start' | 'End'): Promise<void> {
    try {
      const { settings } = useSettingsStore.getState();
      log.info(
        `[RecordingService] Playing ${variant} sound: ${settings.audio.selectedSound}.mp3`
      );

      await invoke('play_notification_sound', {
        soundName: `${settings.audio.selectedSound}.mp3`,
        variant,
      });

      log.info(`[RecordingService] ✅ ${variant} sound played successfully`);
    } catch (error) {
      log.error(
        error,
        `[RecordingService] ❌ Failed to play ${variant} sound:`
      );
      // Don't throw - notification sound failure shouldn't stop recording
    }
  }

  /**
   * Determine if start sound should be played based on settings
   */
  private shouldPlayStartSound(): boolean {
    const { settings } = useSettingsStore.getState();

    // First check if interaction sounds are enabled
    if (!settings.personalization.interactionSounds) {
      return false;
    }

    // Then check notification timing settings
    return (
      settings.audio.notificationTiming === 'start_stop' ||
      settings.audio.notificationTiming === 'start_completion'
    );
  }

  /**
   * Determine if end sound should be played based on settings
   */
  private shouldPlayEndSound(): boolean {
    const { settings } = useSettingsStore.getState();

    // First check if interaction sounds are enabled
    if (!settings.personalization.interactionSounds) {
      return false;
    }

    // Only play end sound on recording stop if timing is "start_stop"
    // "completion_only" and "start_completion" timings are handled by dictation service
    return settings.audio.notificationTiming === 'start_stop';
  }

  /**
   * Perform async usage check in background (non-blocking)
   * This runs in parallel with recording startup to check usage limits
   */
  private async performAsyncUsageCheck(): Promise<void> {
    try {
      const usageStatus = await trpcClient.usage.getStatus.query();

      // Update the query cache with fresh data
      const usageQueryKey = trpc.usage.getStatus.queryKey();
      queryClient.setQueryData(usageQueryKey, usageStatus);
    } catch (error) {
      log.warn(error, '[RecordingService] Async usage check failed:');
      // Don't throw - this is a background operation
    }
  }

  /**
   * Reset all flags (useful for cleanup)
   */
  reset(): void {
    this.isToggling = false;
    this.isPushToTalkActive = false;
  }
}

export const recordingService = RecordingService.getInstance();
