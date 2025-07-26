import { useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";

import { useEventStore } from "~/stores/event.store";
import { useGeckoBarNotificationStore } from "~/stores/gecko-bar-notification.store";
import { trpc } from "~/trpc";

// State machine for gecko bar display
export type GeckoBarDisplayMode =
  | "idle" // Nothing happening, collapsed
  | "hover" // User hovering, show appropriate message
  | "notification" // Active notification, highest priority
  | "recording" // Currently recording, expanded
  | "transcribing"; // Processing transcription, expanded

export interface GeckoBarDisplayState {
  mode: GeckoBarDisplayMode;
  isExpanded: boolean;
  showTooltip: boolean;
  tooltipMessage: string;
}

type DisplayAction =
  | { type: "HOVER_START"; canTranscribe: boolean }
  | { type: "HOVER_END" }
  | { type: "NOTIFICATION_START"; message: string }
  | { type: "NOTIFICATION_END" }
  | { type: "RECORDING_START" }
  | { type: "RECORDING_END" }
  | { type: "TRANSCRIBING_START" }
  | { type: "TRANSCRIBING_END" }
  | { type: "FORCE_IDLE" };

// State machine reducer with clear priorities
function displayReducer(
  state: GeckoBarDisplayState,
  action: DisplayAction,
): GeckoBarDisplayState {
  switch (action.type) {
    case "NOTIFICATION_START":
      return {
        mode: "notification",
        isExpanded: true,
        showTooltip: true,
        tooltipMessage: action.message,
      };

    case "RECORDING_START":
      // Recording overrides everything except active notifications
      if (state.mode === "notification") {
        return state; // Keep notification visible during recording
      }
      return {
        mode: "recording",
        isExpanded: true,
        showTooltip: false,
        tooltipMessage: "",
      };

    case "TRANSCRIBING_START":
      // Transcribing overrides everything except active notifications
      if (state.mode === "notification") {
        return state; // Keep notification visible during transcribing
      }
      return {
        mode: "transcribing",
        isExpanded: true,
        showTooltip: false,
        tooltipMessage: "",
      };

    case "HOVER_START":
      // Hover only works if not in a high-priority state
      if (
        state.mode === "notification" ||
        state.mode === "recording" ||
        state.mode === "transcribing"
      ) {
        return state;
      }

      const message = action.canTranscribe
        ? "Click to start dictating"
        : "Usage limit reached";
      return {
        mode: "hover",
        isExpanded: true,
        showTooltip: true,
        tooltipMessage: message,
      };

    case "HOVER_END":
      // Only transition from hover to idle
      if (state.mode === "hover") {
        return {
          mode: "idle",
          isExpanded: false,
          showTooltip: false,
          tooltipMessage: "",
        };
      }
      return state;

    case "NOTIFICATION_END":
      // When notification ends, determine next state based on current conditions
      if (state.mode === "notification") {
        // Note: We'll need to re-evaluate the current state
        // This will be handled by the useEffect that calls this
        return {
          mode: "idle",
          isExpanded: false,
          showTooltip: false,
          tooltipMessage: "",
        };
      }
      return state;

    case "RECORDING_END":
    case "TRANSCRIBING_END":
      // Only transition if we're actually in that mode
      if (state.mode === "recording" || state.mode === "transcribing") {
        return {
          mode: "idle",
          isExpanded: false,
          showTooltip: false,
          tooltipMessage: "",
        };
      }
      return state;

    case "FORCE_IDLE":
      return {
        mode: "idle",
        isExpanded: false,
        showTooltip: false,
        tooltipMessage: "",
      };

    default:
      return state;
  }
}

const initialState: GeckoBarDisplayState = {
  mode: "idle",
  isExpanded: false,
  showTooltip: false,
  tooltipMessage: "",
};

export function useGeckoBarDisplayState(
  isHovered: boolean,
  isLoading: boolean,
) {
  const [state, dispatch] = useReducer(displayReducer, initialState);

  // External state
  const notification = useGeckoBarNotificationStore(
    (state) => state.notification,
  );
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  // Usage status
  const { data: usageStatus } = useQuery({
    ...trpc.usage.getStatus.queryOptions(),
    refetchInterval: 30000,
  });

  const canTranscribe = !usageStatus || usageStatus.canTranscribe;

  // Single effect to manage all state transitions
  useEffect(() => {
    // Priority 1: Notifications (highest)
    if (notification) {
      dispatch({ type: "NOTIFICATION_START", message: notification.message });
      return;
    }

    // Priority 2: Recording states
    if (isRecording) {
      dispatch({ type: "RECORDING_START" });
      return;
    }

    if (isTranscribing) {
      dispatch({ type: "TRANSCRIBING_START" });
      return;
    }

    // Priority 3: Hover state
    if (isHovered && !isLoading) {
      dispatch({ type: "HOVER_START", canTranscribe });
      return;
    }

    // Priority 4: Clean up based on what was previous state
    if (state.mode === "notification" && !notification) {
      dispatch({ type: "NOTIFICATION_END" });
    } else if (state.mode === "recording" && !isRecording) {
      dispatch({ type: "RECORDING_END" });
    } else if (state.mode === "transcribing" && !isTranscribing) {
      dispatch({ type: "TRANSCRIBING_END" });
    } else if (state.mode === "hover" && !isHovered) {
      dispatch({ type: "HOVER_END" });
    }
  }, [
    notification,
    isRecording,
    isTranscribing,
    isHovered,
    isLoading,
    canTranscribe,
    state.mode,
  ]);

  return {
    displayState: state,
    dispatch,
  };
}
