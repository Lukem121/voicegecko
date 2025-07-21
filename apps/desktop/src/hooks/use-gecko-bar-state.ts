import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { useGeckoBarNotificationStore } from "~/stores/gecko-bar-notification.store";
import { trpc } from "~/trpc";
import { useAudioProcessor } from "./use-audio-processor";
import { useGeckoBarSettings } from "./use-gecko-bar-settings";
import { useTimeoutManager } from "./use-timeout-manager";

export function useGeckoBarState(): UseGeckoBarStateReturn {
  // Basic UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Recording state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wasRecentlyRecording, setWasRecentlyRecording] = useState(false);

  // External state from main event store (unified across windows)
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  // Notification state
  const notification = useGeckoBarNotificationStore(
    (state) => state.notification,
  );

  // Fetch usage status
  const { data: usageStatus } = useQuery({
    ...trpc.usage.getStatus.queryOptions(),
    refetchInterval: 60000, // Refetch every minute
  });

  // Determine tooltip message based on usage status or notifications
  const tooltipMessage =
    notification?.message || // Priority: Show notification if available
    (usageStatus && !usageStatus.canTranscribe
      ? "Usage limit reached"
      : undefined); // Will default to "Click to start dictating"

  // Hooks
  const timeoutManager = useTimeoutManager();
  const audioProcessor = useAudioProcessor({
    isRecording,
    isTranscribing,
    isTransitioning,
    recordingStatus,
  });

  // Compute if it's safe to collapse
  const safeToCollapse = isSafeToCollapse({
    isRecording,
    isLoading,
    isTranscribing,
    isTransitioning,
    recordingStatus,
    isHovered,
    wasRecentlyRecording,
  });

  // Track recent recording activity to prevent immediate collapse
  useEffect(() => {
    if (isRecording) {
      setWasRecentlyRecording(true);
    } else if (
      recordingStatus === "idle" &&
      !isTranscribing &&
      !isTransitioning
    ) {
      // Clear the recent recording state after a brief delay when completely idle
      timeoutManager.setTimeout(
        "cleanup",
        () => {
          setWasRecentlyRecording(false);
        },
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

  // Handle recording state changes and window management
  useEffect(() => {
    // Clear any pending collapse timeout since states are changing
    timeoutManager.clearTimeout("collapse");

    // Clear transition state on error or idle
    if (
      (recordingStatus === "error" || recordingStatus === "idle") &&
      isTransitioning
    ) {
      setIsTransitioning(false);
    }

    if (isRecording) {
      // Recording started - expand the bar and hide tooltip
      setIsExpanded(true);
      setShowTooltip(false);
      timeoutManager.clearTimeout("tooltip");
    } else if (isTranscribing) {
      // Transcribing - keep expanded to show processing animation
      setIsExpanded(true);
    } else if (recordingStatus === "processing") {
      // Processing transcription - keep expanded to show processing animation
      setIsExpanded(true);
    } else if (recordingStatus === "error") {
      // Error state - keep expanded to show error indication
      setIsExpanded(true);
    } else if (safeToCollapse) {
      // Safe to collapse: completely idle, not hovered, and not recently recording
      setIsExpanded(false);
    }
  }, [
    isRecording,
    isHovered,
    recordingStatus,
    isTranscribing,
    isTransitioning,
    wasRecentlyRecording,
    safeToCollapse,
    timeoutManager,
  ]);

  // Clear transition state when transcription starts or after timeout
  useEffect(() => {
    if (isTransitioning) {
      // Clear immediately if transcription started
      if (isTranscribing) {
        setIsTransitioning(false);
      } else {
        // Set a timeout as a safety net
        timeoutManager.setTimeout(
          "expand",
          () => {
            setIsTransitioning(false);
          },
          TIMINGS.TRANSITION_TIMEOUT,
        );
      }
    }
  }, [isTranscribing, isTransitioning, timeoutManager]);

  // Handle notifications
  useEffect(() => {
    if (notification) {
      // Show tooltip and expand bar for notifications
      setShowTooltip(true);
      setIsExpanded(true);

      // Clear any existing tooltip timer
      timeoutManager.clearTimeout("tooltip");

      // If notification has duration, hide tooltip after that duration
      if (notification.duration) {
        timeoutManager.setTimeout(
          "tooltip",
          () => {
            setShowTooltip(false);
            // Optionally collapse if nothing else is happening
            if (!isRecording && !isTranscribing && !isHovered) {
              setIsExpanded(false);
            }
          },
          notification.duration,
        );
      }
    }
  }, [notification, timeoutManager, isRecording, isTranscribing, isHovered]);

  // Initialize event systems for gecko bar window
  useEffect(() => {
    // Initialize main Tauri events (for unified state management)
    // Pass isGeckoBar flag to prevent business logic execution
    initializeTauriEvents({ isGeckoBar: true }).catch((error) => {
      console.error(
        "Failed to initialize main Tauri events in gecko bar:",
        error,
      );
    });

    // Initialize gecko bar specific events (for audio visualizer)
    initializeGeckoBarEvents().catch((error) => {
      console.error("Failed to initialize Gecko Bar events:", error);
    });
  }, []);

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);

    // Clear any pending timeouts
    timeoutManager.clearTimeout("collapse");
    timeoutManager.clearTimeout("expand");

    // Start tooltip timer - show after delay
    if (!isRecording && !isLoading && !isExpanded) {
      timeoutManager.setTimeout(
        "tooltip",
        () => {
          setShowTooltip(true);
        },
        TIMINGS.TOOLTIP_DELAY,
      );
    }

    // Expand immediately if not already expanded
    if (!isExpanded && !isLoading) {
      setIsExpanded(true);
    }
  }, [isRecording, isLoading, isExpanded, timeoutManager]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);

    // Clear expand timeout
    timeoutManager.clearTimeout("expand");

    // Add a small delay before clearing tooltip to prevent accidental cancellation
    // This allows for quick mouse movements without canceling pending tooltips
    timeoutManager.setTimeout(
      "expand", // Reuse expand timeout for this delay
      () => {
        timeoutManager.clearTimeout("tooltip");
        setShowTooltip(false);
      },
      100, // 100ms grace period for mouse movements
    );
  }, [isHovered, timeoutManager, showTooltip, isExpanded]);

  // Optimized click handler using direct store access
  const handleClick = useCallback(() => {
    // Get current state directly from store for fastest response
    const eventState = useEventStore.getState();

    // Start recording immediately if idle - skip all other operations
    if (eventState.recordingStatus === "idle" && !eventState.isRecording()) {
      recordingService.toggleRecording().catch(console.error);
      // Return early to skip UI updates - they'll happen via state subscriptions
      return;
    }

    // Only do UI cleanup if not starting recording
    setShowTooltip(false);
    timeoutManager.clearTimeout("tooltip");
  }, [timeoutManager]); // Minimal dependencies for faster execution

  const handleCancel = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (isLoading) {
        return;
      }

      if (isRecording) {
        setIsLoading(true);
        setIsTransitioning(false); // Clear any transition state
        try {
          await recordingService.cancelRecording();
        } catch (error) {
          // TODO: Implement proper error notification system
          console.error("Failed to cancel recording:", error);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [isLoading, isRecording],
  );

  const handleFinish = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (isLoading) {
        return;
      }

      if (isRecording) {
        // Set transition state BEFORE calling recording service to prevent race condition
        setIsTransitioning(true);
        setIsLoading(true);
        try {
          await recordingService.toggleRecording();
        } catch (error) {
          // TODO: Implement proper error notification system
          console.error("Failed to finish recording:", error);
          // Clear transition state on error
          setIsTransitioning(false);
        } finally {
          setIsLoading(false);
        }
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

  const state = {
    isExpanded,
    isHovered,
    showTooltip,
    isLoading,
    isTransitioning,
    wasRecentlyRecording,
    visualizerActive: audioProcessor.isActive,
    audioLevel: audioProcessor.audioLevel,
    tooltipMessage,
  };

  return {
    state,
    handlers,
    safeToCollapse,
  };
}
