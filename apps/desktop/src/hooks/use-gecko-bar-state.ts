import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';
import { TIMINGS } from '~/components/gecko-bar/gecko-bar-app.constants';
import type {
  GeckoBarEventHandlers,
  UseGeckoBarStateReturn,
} from '~/components/gecko-bar/gecko-bar-app.types';
import {
  canCancelSession,
  isSafeToCollapse,
} from '~/components/gecko-bar/gecko-bar-app.utils';
import { initializeGeckoBarEvents } from '~/lib/gecko-bar-events';
import { initializeGeckoBarDictationBridge } from '~/lib/dictation-event-bridge';
import { useEventStore } from '~/stores/event.store';
import type {
  RecordingStateChangedEvent,
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

  // Pass-through mode state
  const [isPassthroughMode, setIsPassthroughMode] = useState(false);
  const [passthroughTimeRemaining, setPassthroughTimeRemaining] = useState(0);

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
  const { displayState } = useGeckoBarDisplayState(
    isHovered,
    isLoading,
    isPassthroughMode,
    `Can click apps behind (${passthroughTimeRemaining}s)`
  );

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

  // Clear transition state when dictation starts or after timeout
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

        await initializeGeckoBarDictationBridge();

        const { listen } = await import('@tauri-apps/api/event');

        await listen('recording-state-changed', (event) => {
          const payload = event.payload as RecordingStateChangedEvent;
          log.info('[GeckoBar] 🎙️ Recording state changed (UI only):', payload);
          useEventStore.getState().setRecordingStatus(payload);
        });

        log.info('[GeckoBar] ✅ UI-only event listeners initialized');
      } catch (error) {
        log.error(error, 'Failed to initialize Gecko Bar UI events:');
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
          log.error(error, '[GeckoBar] Failed to emit recording request:');
        }
      );
    }
  }, []);

  // Cancel button handler - send event to main window
  const handleCancel = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const cancelAllowed = canCancelSession({
        isRecording,
        isTranscribing,
        isTransitioning,
        isLoading,
      });
      if (!cancelAllowed) {
        return;
      }

      log.info('[GeckoBar] 🚫 Sending cancel recording request to main window');
      setIsLoading(true);
      setIsTransitioning(false);

      try {
        // Send event to main window to handle the business logic
        await emit('gecko-bar-recording-request', { action: 'cancel' });
      } catch (error) {
        log.error(error, '[GeckoBar] Failed to emit cancel request:');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isRecording, isTranscribing, isTransitioning]
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
        log.error(error, '[GeckoBar] Failed to emit finish request:');
        setIsTransitioning(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isRecording]
  );

  // Right-click handler for pass-through mode
  const handleRightClick = useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (isPassthroughMode || isLoading) {
        return;
      }

      log.info('[GeckoBar] 👆 Activating pass-through mode for 5 seconds');

      try {
        // Enable pass-through mode in Tauri
        await invoke('set_gecko_bar_cursor_passthrough', { ignore: true });

        setIsPassthroughMode(true);
        setPassthroughTimeRemaining(5);

        // Start countdown timer
        let timeLeft = 5;
        const countdownInterval = setInterval(() => {
          timeLeft -= 1;
          setPassthroughTimeRemaining(timeLeft);

          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);

        // Set timeout to disable pass-through after 5 seconds
        timeoutManager.setTimeout(
          'passthrough',
          async () => {
            try {
              await invoke('set_gecko_bar_cursor_passthrough', {
                ignore: false,
              });
              setIsPassthroughMode(false);
              setPassthroughTimeRemaining(0);
              clearInterval(countdownInterval);
              log.info('[GeckoBar] ✋ Pass-through mode disabled');
            } catch (error) {
              log.error(
                error,
                '[GeckoBar] Failed to disable pass-through mode:'
              );
            }
          },
          5000
        );
      } catch (error) {
        log.error(error, '[GeckoBar] Failed to enable pass-through mode:');
      }
    },
    [isPassthroughMode, isLoading, timeoutManager]
  );

  const handlers: GeckoBarEventHandlers = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    onRightClick: handleRightClick,
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
    isPassthroughMode,
    passthroughTimeRemaining,
  };

  return { state, handlers, safeToCollapse };
}
