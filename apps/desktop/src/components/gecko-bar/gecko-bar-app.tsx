import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import { useCallback, useMemo } from 'react';
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
  const recordingStatus = useEventStore(
    (eventState) => eventState.recordingStatus
  );
  const isRecording = useEventStore((eventState) => eventState.isRecording());
  const isTranscribing = useEventStore((eventState) =>
    eventState.isTranscribing()
  );

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

  // Helper functions for state and dimensions
  const getBarState = useCallback(() => {
    if (showActiveState) {
      return 'recording';
    }
    if (state.isExpanded) {
      return 'expanded';
    }
    return 'collapsed';
  }, [showActiveState, state.isExpanded]);

  const getBarWidth = useCallback(() => {
    if (showActiveState) {
      return DIMENSIONS.BAR.EXPANDED_WIDTH;
    }
    if (state.isExpanded) {
      return DIMENSIONS.BAR.HOVER_WIDTH;
    }
    return DIMENSIONS.BAR.COLLAPSED_WIDTH;
  }, [showActiveState, state.isExpanded]);

  const getBarHeight = useCallback(() => {
    if (showActiveState) {
      return DIMENSIONS.BAR.EXPANDED_HEIGHT;
    }
    if (state.isExpanded) {
      return DIMENSIONS.BAR.HOVER_HEIGHT;
    }
    return DIMENSIONS.BAR.COLLAPSED_HEIGHT;
  }, [showActiveState, state.isExpanded]);

  // Memoize animation dimensions
  const animationDimensions = useMemo(
    () => ({
      width: getBarWidth(),
      height: getBarHeight(),
    }),
    [getBarWidth, getBarHeight]
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
      <button
        className="-translate-x-1/2 fixed bottom-2.5 left-1/2 z-50"
        onMouseEnter={() => {
          handlers.onMouseEnter();
          // Track hover interaction
          analytics.track('gecko_bar_interaction', {
            action: 'hover',
            state: getBarState(),
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
        type="button"
      >
        {/* Tooltip */}
        <GeckoBarTooltip
          isPassthroughMode={state.isPassthroughMode}
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
              : 'bg-muted/70',
            state.isPassthroughMode && 'opacity-50'
          )}
          onClick={handlers.onClick}
          onContextMenu={(e) => {
            e.preventDefault();
            handlers.onRightClick(e);
            // Track right-click interaction for pass-through
            analytics.track('gecko_bar_interaction', {
              action: 'click',
              state: getBarState(),
            });
          }}
          onMouseDown={(e) => {
            // Only handle left clicks (button 0), ignore right clicks (button 2)
            if (e.button !== 0) {
              return;
            }

            handlers.onClick();
            // Track click interaction
            analytics.track('gecko_bar_interaction', {
              action: 'click',
              state: getBarState(),
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
      </button>
    </div>
  );
}
