import { log } from '@acme/observability/log';
import { emit } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';
import { TIMINGS } from '~/components/gecko-bar/gecko-bar-app.constants';
import type {
  GeckoBarEventHandlers,
  UseGeckoBarStateReturn,
} from '~/components/gecko-bar/gecko-bar-app.types';
import { isSafeToCollapse } from '~/components/gecko-bar/gecko-bar-app.utils';
import { initializeGeckoBarEvents } from '~/lib/gecko-bar-events';
import { useEventStore } from '~/stores/event.store';
import type {
  RecordingStateChangedEvent,
  TranscriptionProgressEvent,
} from '~/types/events';
import { useAudioProcessor } from './use-audio-processor';
import { useGeckoBarDisplayState } from './use-gecko-bar-display-state';
import { useTimeoutManager } from './use-timeout-manager';

export function useGeckoBarState(): UseGeckoBarStateReturn {
  // Basic UI state (only what's not managed by display state machine)
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wasRecentlyRecording, setWasRecentlyRecording] = useState(false);

  // External state from main event store
  const recordingStatus = useEventStore(
    (recordingState) => recordingState.recordingStatus
  );
  const isRecording = useEventStore((recordingState) =>
    recordingState.isRecording()
  );
  const isTranscribing = useEventStore((recordingState) =>
    recordingState.isTranscribing()
  );

  // Centralized display state machine (single source of truth)
  const { displayState } = useGeckoBarDisplayState(isHovered, isLoading);

  // Other hooks
  const timeoutManager = useTimeoutManager();
  const audioProcessor = useAudioProcessor({
    isRecording,
    isTranscribing,
    isTransitioning,
    recordingStatus,
  });

  // Compute if it's safe to collapse (used for legacy compatibility)
  const safeToCollapse = isSafeToCollapse({
    isRecording,
    isLoading,
    isTranscribing,
    isTransitioning,
    recordingStatus,
    isHovered,
    wasRecentlyRecording,
  });

  // Track recent recording activity (minimal effect for cleanup)
  useEffect(() => {
    if (isRecording) {
      setWasRecentlyRecording(true);
    } else if (
      recordingStatus === 'idle' &&
      !isTranscribing &&
      !isTransitioning
    ) {
      timeoutManager.setTimeout(
        'cleanup',
        () => setWasRecentlyRecording(false),
        TIMINGS.RECENT_RECORDING_GRACE_PERIOD
      );
    }
  }, [
    isRecording,
    isTranscribing,
    isTransitioning,
    recordingStatus,
    timeoutManager,
  ]);

  // Clear transition state when transcription starts or after timeout
  useEffect(() => {
    if (isTransitioning) {
      if (isTranscribing) {
        setIsTransitioning(false);
      } else {
        timeoutManager.setTimeout(
          'expand', // Use valid timeout key
          () => setIsTransitioning(false),
          TIMINGS.TRANSITION_TIMEOUT
        );
      }
    }
  }, [isTranscribing, isTransitioning, timeoutManager]);

  // Initialize minimal gecko bar events (UI-only, no business logic)
  useEffect(() => {
    log.info('[GeckoBar] 🎨 Initializing UI-only event listeners');

    async function initializeGeckoBarUIEvents() {
      try {
        // Initialize gecko bar specific events (notifications, audio levels)
        await initializeGeckoBarEvents();

        // Listen to recording state changes (UI updates only)
        const { listen } = await import('@tauri-apps/api/event');

        await listen('recording-state-changed', (event) => {
          const payload = event.payload as RecordingStateChangedEvent;
          log.info('[GeckoBar] 🎙️ Recording state changed (UI only):', payload);
          useEventStore.getState().setRecordingStatus(payload);
        });

        // Listen to transcription progress (UI updates only - NO completion handling)
        await listen('transcription-progress', (event) => {
          const payload = event.payload as TranscriptionProgressEvent;
          log.info(
            '[GeckoBar] 📝 Transcription progress (UI only):',
            payload.status
          );

          const store = useEventStore.getState();
          const metadata = {
            duration_seconds: payload.duration_seconds,
            model_used: payload.model_used,
            sample_rate: payload.sample_rate,
          };

          // Only update transcription progress state (NO completion business logic)
          store.setTranscriptionProgress(
            payload.status,
            payload.data,
            metadata
          );

          // NO completion handling - main window handles that!
          if (payload.status === 'Complete') {
            log.info(
              '[GeckoBar] ✅ Transcription complete (UI updated, business logic handled by main window)'
            );
          }
        });

        log.info('[GeckoBar] ✅ UI-only event listeners initialized');
      } catch (error) {
        log.error('Failed to initialize Gecko Bar UI events:', error);
      }
    }

    initializeGeckoBarUIEvents();
  }, []);

  // Event handlers - simplified since display state is managed centrally
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Clear any pending timeouts
    timeoutManager.clearTimeout('collapse');
    timeoutManager.clearTimeout('expand');
  }, [timeoutManager]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Clear expand timeout
    timeoutManager.clearTimeout('expand');
  }, [timeoutManager]);

  // Click handler for recording - send event to main window instead of direct service call
  const handleClick = useCallback(() => {
    const eventState = useEventStore.getState();

    if (eventState.recordingStatus === 'idle' && !eventState.isRecording()) {
      log.info('[GeckoBar] 🎤 Sending start recording request to main window');
      // Send event to main window to handle the business logic
      emit('gecko-bar-recording-request', { action: 'toggle' }).catch(
        (error) => {
          log.error('[GeckoBar] Failed to emit recording request:', error);
        }
      );
    }
  }, []);

  // Cancel button handler - send event to main window
  const handleCancel = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isLoading || !isRecording) {
        return;
      }

      log.info('[GeckoBar] 🚫 Sending cancel recording request to main window');
      setIsLoading(true);
      setIsTransitioning(false);

      try {
        // Send event to main window to handle the business logic
        await emit('gecko-bar-recording-request', { action: 'cancel' });
      } catch (error) {
        log.error('[GeckoBar] Failed to emit cancel request:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isRecording]
  );

  // Finish button handler - send event to main window
  const handleFinish = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isLoading || !isRecording) {
        return;
      }

      log.info('[GeckoBar] ✅ Sending finish recording request to main window');
      setIsTransitioning(true);
      setIsLoading(true);

      try {
        // Send event to main window to handle the business logic
        await emit('gecko-bar-recording-request', { action: 'finish' });
      } catch (error) {
        log.error('[GeckoBar] Failed to emit finish request:', error);
        setIsTransitioning(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isRecording]
  );

  const handlers: GeckoBarEventHandlers = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    onCancel: handleCancel,
    onFinish: handleFinish,
  };

  // Return state - using display state machine as single source of truth
  const state = {
    isExpanded: displayState.isExpanded,
    isHovered,
    showTooltip: displayState.showTooltip,
    isLoading,
    isTransitioning,
    wasRecentlyRecording,
    visualizerActive: audioProcessor.isActive,
    audioLevel: audioProcessor.audioLevel,
    tooltipMessage: displayState.tooltipMessage,
  };

  return { state, handlers, safeToCollapse };
}
