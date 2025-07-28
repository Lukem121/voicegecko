import { useCallback, useEffect, useState } from "react";

import type {
  GeckoBarEventHandlers,
  UseGeckoBarStateReturn,
} from "~/components/gecko-bar/gecko-bar-app.types";
import { TIMINGS } from "~/components/gecko-bar/gecko-bar-app.constants";
import { isSafeToCollapse } from "~/components/gecko-bar/gecko-bar-app.utils";
import { initializeGeckoBarEvents } from "~/lib/gecko-bar-events";
import { initializeTauriEvents } from "~/lib/tauri-events";
import { recordingService } from "~/services/recording.service";
import { useEventStore } from "~/stores/event.store";
import { useAudioProcessor } from "./use-audio-processor";
import { useGeckoBarDisplayState } from "./use-gecko-bar-display-state";
import { useTimeoutManager } from "./use-timeout-manager";

export function useGeckoBarState(): UseGeckoBarStateReturn {
  // Basic UI state (only what's not managed by display state machine)
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wasRecentlyRecording, setWasRecentlyRecording] = useState(false);

  // External state from main event store
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

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
      recordingStatus === "idle" &&
      !isTranscribing &&
      !isTransitioning
    ) {
      timeoutManager.setTimeout(
        "cleanup",
        () => setWasRecentlyRecording(false),
        TIMINGS.RECENT_RECORDING_GRACE_PERIOD,
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
          "expand", // Use valid timeout key
          () => setIsTransitioning(false),
          TIMINGS.TRANSITION_TIMEOUT,
        );
      }
    }
  }, [isTranscribing, isTransitioning, timeoutManager]);

  // Initialize event systems for gecko bar window
  useEffect(() => {
    initializeTauriEvents({ isGeckoBar: true }).catch((error) => {
      console.error(
        "Failed to initialize main Tauri events in gecko bar:",
        error,
      );
    });

    initializeGeckoBarEvents().catch((error) => {
      console.error("Failed to initialize Gecko Bar events:", error);
    });

    // Initialize stores for gecko bar window
    import("~/stores/store-registry").then(({ storeRegistry }) => {
      storeRegistry.initializeAll().catch((error) => {
        console.error("[GeckoBar] Failed to initialize stores:", error);
      });
    });
  }, []);

  // Event handlers - simplified since display state is managed centrally
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Clear any pending timeouts
    timeoutManager.clearTimeout("collapse");
    timeoutManager.clearTimeout("expand");
  }, [timeoutManager]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Clear expand timeout
    timeoutManager.clearTimeout("expand");
  }, [timeoutManager]);

  // Click handler for recording
  const handleClick = useCallback(() => {
    const eventState = useEventStore.getState();

    if (eventState.recordingStatus === "idle" && !eventState.isRecording()) {
      recordingService
        .toggleRecording({ isKeyboardShortcut: false })
        .catch(console.error);
    }
  }, []);

  // Cancel button handler
  const handleCancel = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isLoading || !isRecording) return;

      setIsLoading(true);
      setIsTransitioning(false);
      try {
        await recordingService.cancelRecording();
      } catch (error) {
        console.error("Failed to cancel recording:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isRecording],
  );

  // Finish button handler
  const handleFinish = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isLoading || !isRecording) return;

      setIsTransitioning(true);
      setIsLoading(true);
      try {
        await recordingService.toggleRecording();
      } catch (error) {
        console.error("Failed to finish recording:", error);
        setIsTransitioning(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isRecording],
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
