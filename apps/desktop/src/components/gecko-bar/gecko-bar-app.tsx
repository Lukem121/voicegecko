import { useMemo } from "react";
import { motion } from "motion/react";

import { cn } from "@acme/ui/lib/utils";

import { useGeckoBarState } from "~/hooks/use-gecko-bar-state";
import { useEventStore } from "~/stores/event.store";
import { AudioVisualizer } from "../audio-visualizer";
import {
  ANIMATIONS,
  DIMENSIONS,
  GECKO_PATTERN_SVG,
  STYLES,
} from "./gecko-bar-app.constants";
import { isButtonEnabled, shouldShowActiveState } from "./gecko-bar-app.utils";
import { GeckoBarButton } from "./gecko-bar-button";
import { GeckoBarTooltip } from "./gecko-bar-tooltip";

export function GeckoBarApp() {
  const { state, handlers } = useGeckoBarState();

  // External state for button logic from main event store
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  // Memoize derived state for performance
  const showActiveState = useMemo(
    () =>
      shouldShowActiveState({
        isRecording,
        isTranscribing,
        isTransitioning: state.isTransitioning,
        recordingStatus,
        wasRecentlyRecording: state.wasRecentlyRecording,
      }),
    [
      isRecording,
      isTranscribing,
      state.isTransitioning,
      recordingStatus,
      state.wasRecentlyRecording,
    ],
  );

  // Memoize button states
  const cancelButtonState = useMemo(
    () => ({
      isVisible: showActiveState,
      isEnabled: isButtonEnabled("cancel", {
        isRecording,
        isTranscribing,
        isTransitioning: state.isTransitioning,
        isLoading: state.isLoading,
      }),
      isLoading: state.isLoading,
    }),
    [
      showActiveState,
      isRecording,
      isTranscribing,
      state.isTransitioning,
      state.isLoading,
    ],
  );

  const finishButtonState = useMemo(
    () => ({
      isVisible: showActiveState,
      isEnabled: isButtonEnabled("finish", {
        isRecording,
        isTranscribing,
        isTransitioning: state.isTransitioning,
        isLoading: state.isLoading,
      }),
      isLoading: isTranscribing,
    }),
    [
      showActiveState,
      isRecording,
      isTranscribing,
      state.isTransitioning,
      state.isLoading,
    ],
  );

  // Memoize animation dimensions
  const animationDimensions = useMemo(
    () => ({
      width: showActiveState
        ? DIMENSIONS.BAR.EXPANDED_WIDTH
        : state.isExpanded
          ? DIMENSIONS.BAR.HOVER_WIDTH
          : DIMENSIONS.BAR.COLLAPSED_WIDTH,
      height: showActiveState
        ? DIMENSIONS.BAR.EXPANDED_HEIGHT
        : state.isExpanded
          ? DIMENSIONS.BAR.HOVER_HEIGHT
          : DIMENSIONS.BAR.COLLAPSED_HEIGHT,
    }),
    [showActiveState, state.isExpanded],
  );

  // Memoize background pattern style
  const patternStyle = useMemo(
    () => ({
      backgroundImage: GECKO_PATTERN_SVG,
      backgroundPosition: "center",
      backgroundRepeat: "repeat",
      backgroundSize: `${STYLES.PATTERN_SIZE}px ${STYLES.PATTERN_SIZE}px`,
    }),
    [],
  );

  return (
    <div
      className="fixed bottom-2.5 left-1/2 z-50 -translate-x-1/2"
      style={{
        width: DIMENSIONS.HITBOX.WIDTH,
        height: DIMENSIONS.HITBOX.HEIGHT,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
    >
      {/* Tooltip */}
      <GeckoBarTooltip show={state.showTooltip} isRecording={isRecording} />

      {/* Main bar */}
      <motion.div
        className={cn(
          "!border-primary/70 relative flex items-center justify-center overflow-hidden rounded-full border",
          state.isLoading ? "bg-muted/70 cursor-wait shadow-lg" : "bg-muted/70",
        )}
        animate={animationDimensions}
        transition={{
          type: "spring",
          stiffness: ANIMATIONS.SPRING.STIFFNESS,
          damping: ANIMATIONS.SPRING.DAMPING,
          mass: ANIMATIONS.SPRING.MASS,
        }}
        onClick={handlers.onClick}
      >
        {/* Gecko scales background pattern */}
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            ...patternStyle,
            opacity: STYLES.PATTERN_OPACITY,
          }}
        />

        {/* Expanded state content */}
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center",
            state.isExpanded || showActiveState
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          {/* Cancel button */}
          <GeckoBarButton
            type="cancel"
            state={cancelButtonState}
            onClick={handlers.onCancel}
          />

          {/* Audio visualizer */}
          <AudioVisualizer
            audioLevel={state.audioLevel}
            isRecording={state.visualizerActive}
            mode="voice-reactive"
            size="small"
            className="flex-1"
          />

          {/* Finish button */}
          <GeckoBarButton
            type="finish"
            state={finishButtonState}
            onClick={handlers.onFinish}
          />
        </div>
      </motion.div>
    </div>
  );
}
