import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import { useGeckoBarState } from '~/hooks/use-gecko-bar-state';
import { analytics } from '~/lib/analytics/posthog-analytics';
import { useEventStore } from '~/stores/event.store';
import { AudioVisualizer } from '../audio-visualizer';
import {
  ANIMATIONS,
  DIMENSIONS,
  GECKO_PATTERN_SVG,
  STYLES,
} from './gecko-bar-app.constants';
import { isButtonEnabled, shouldShowActiveState } from './gecko-bar-app.utils';
import { GeckoBarButton } from './gecko-bar-button';
import { GeckoBarTooltip } from './gecko-bar-tooltip';

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
    ]
  );

  // Memoize button states
  const cancelButtonState = useMemo(
    () => ({
      isVisible: showActiveState,
      isEnabled: isButtonEnabled('cancel', {
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
    ]
  );

  const finishButtonState = useMemo(
    () => ({
      isVisible: showActiveState,
      isEnabled: isButtonEnabled('finish', {
        isRecording,
        isTranscribing,
        isTransitioning: state.isTransitioning,
        isLoading: state.isLoading,
      }),
      isLoading: isTranscribing || state.isTransitioning,
    }),
    [
      showActiveState,
      isRecording,
      isTranscribing,
      state.isTransitioning,
      state.isLoading,
    ]
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
    [showActiveState, state.isExpanded]
  );

  // Memoize background pattern style
  const patternStyle = useMemo(
    () => ({
      backgroundImage: GECKO_PATTERN_SVG,
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
      backgroundSize: `${STYLES.PATTERN_SIZE}px ${STYLES.PATTERN_SIZE}px`,
    }),
    []
  );

  return (
    <div className="dark">
      <div
        className="-translate-x-1/2 fixed bottom-2.5 left-1/2 z-50"
        onMouseEnter={() => {
          handlers.onMouseEnter();
          // Track hover interaction
          analytics.track('gecko_bar_interaction', {
            action: 'hover',
            state: showActiveState
              ? 'recording'
              : state.isExpanded
                ? 'expanded'
                : 'collapsed',
          });
        }}
        onMouseLeave={handlers.onMouseLeave}
        style={{
          width: DIMENSIONS.HITBOX.WIDTH,
          height: DIMENSIONS.HITBOX.HEIGHT,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {/* Tooltip */}
        <GeckoBarTooltip
          isRecording={isRecording}
          message={state.tooltipMessage}
          show={state.showTooltip}
        />

        {/* Main bar */}
        <motion.div
          animate={animationDimensions}
          className={cn(
            '!border-primary/70 relative flex items-center justify-center overflow-hidden rounded-full border',
            state.isLoading
              ? 'cursor-wait bg-muted/70 shadow-lg'
              : 'bg-muted/70'
          )}
          onClick={handlers.onClick}
          onMouseDown={() => {
            handlers.onClick();
            // Track click interaction
            analytics.track('gecko_bar_interaction', {
              action: 'click',
              state: showActiveState
                ? 'recording'
                : state.isExpanded
                  ? 'expanded'
                  : 'collapsed',
            });
          }}
          transition={{
            type: 'spring',
            stiffness: ANIMATIONS.SPRING.STIFFNESS,
            damping: ANIMATIONS.SPRING.DAMPING,
            mass: ANIMATIONS.SPRING.MASS,
          }} // Keep as fallback
        >
          {/* Gecko scales background pattern */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            style={{
              ...patternStyle,
              opacity: STYLES.PATTERN_OPACITY,
            }}
          />

          {/* Expanded state content */}
          <div
            className={cn(
              'relative flex h-full w-full items-center justify-center',
              state.isExpanded || showActiveState
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
            )}
            style={{
              pointerEvents:
                state.isExpanded || showActiveState ? 'auto' : 'none',
            }}
          >
            {/* Cancel button */}
            <GeckoBarButton
              onClick={handlers.onCancel}
              state={cancelButtonState}
              type="cancel"
            />

            {/* Audio visualizer */}
            <AudioVisualizer
              audioLevel={state.audioLevel}
              className="flex-1"
              isRecording={state.visualizerActive}
              mode="voice-reactive"
              size="small"
            />

            {/* Finish button */}
            <GeckoBarButton
              onClick={handlers.onFinish}
              state={finishButtonState}
              type="finish"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
