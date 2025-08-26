import { log } from '@acme/observability/log';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@acme/ui/components/ui/dropdown-menu';
import { cn } from '@acme/ui/lib/utils';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { openUrl } from '@tauri-apps/plugin-opener';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGeckoBarClickthrough } from '~/hooks/use-gecko-bar-clickthrough';
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
  const hitboxRef = useRef<HTMLElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useGeckoBarClickthrough(hitboxRef, { enabled: !isMenuOpen });
  // External state for button logic from main event store
  const recordingStatus = useEventStore(
    (eventState) => eventState.recordingStatus
  );
  const isRecording = useEventStore((eventState) => eventState.isRecording());
  const isTranscribing = useEventStore((eventState) =>
    eventState.isTranscribing()
  );

  // Close dropdown on window blur or page hide (clicking outside app)
  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await webview.listen('tauri://blur', () => {
          setIsMenuOpen(false);
        });
      } catch {
        // ignore
      }
    })();

    const onVisibility = () => {
      if (document.hidden) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (unlisten) {
        unlisten();
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
      // Recording/active state remains fully expanded
      return DIMENSIONS.BAR.EXPANDED_WIDTH;
    }
    if (isMenuOpen || state.isExpanded) {
      // While menu is open, lock at hovered size (not expanded)
      return DIMENSIONS.BAR.HOVER_WIDTH;
    }
    return DIMENSIONS.BAR.COLLAPSED_WIDTH;
  }, [isMenuOpen, showActiveState, state.isExpanded]);

  const getBarHeight = useCallback(() => {
    if (showActiveState) {
      return DIMENSIONS.BAR.EXPANDED_HEIGHT;
    }
    if (isMenuOpen || state.isExpanded) {
      return DIMENSIONS.BAR.HOVER_HEIGHT;
    }
    return DIMENSIONS.BAR.COLLAPSED_HEIGHT;
  }, [isMenuOpen, showActiveState, state.isExpanded]);

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
      <DropdownMenu
        onOpenChange={(open) => {
          // Only allow dropdown to close via Radix events;
          // opening is controlled explicitly by right-click.
          if (!open) {
            setIsMenuOpen(false);
          }
        }}
        open={isMenuOpen}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="-translate-x-1/2 fixed bottom-2.5 left-1/2 z-50"
            onContextMenu={(e) => {
              // Open fixed-position dropdown on right-click
              e.preventDefault();
              setIsMenuOpen(true);
              getCurrentWebviewWindow()
                .setIgnoreCursorEvents(false)
                .catch((err) => {
                  log.error(
                    '[GeckoBar] Failed to disable cursor passthrough',
                    err
                  );
                });
            }}
            onMouseEnter={() => {
              handlers.onMouseEnter();
              // Track hover interaction
              analytics.track('gecko_bar_interaction', {
                action: 'hover',
                state: getBarState(),
              });
            }}
            onMouseLeave={handlers.onMouseLeave}
            ref={hitboxRef as unknown as React.RefObject<HTMLButtonElement>}
            style={{
              // width: DIMENSIONS.HITBOX.WIDTH,
              // height: DIMENSIONS.HITBOX.HEIGHT,
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
              show={state.showTooltip && !isMenuOpen}
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
                  isMenuOpen || state.isExpanded || showActiveState
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0'
                )}
                style={{
                  pointerEvents:
                    isMenuOpen || state.isExpanded || showActiveState
                      ? 'auto'
                      : 'none',
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
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="min-w-[200px]"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => {
              const HOUR_MS = 60 * 60 * 1000;
              import('@tauri-apps/api/core')
                .then(({ invoke }) =>
                  invoke('snooze_gecko_bar_for_ms', { ms: HOUR_MS })
                )
                .catch((err) => log.error('[GeckoBar] Snooze failed', err));
              setIsMenuOpen(false);
            }}
          >
            Hide this for 1 hour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              openUrl('https://discord.gg/BFxNQCzZjB');
              setIsMenuOpen(false);
            }}
          >
            Share feedback
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              emit('gecko-bar-navigation', {
                to: '/settings',
              });
              setIsMenuOpen(false);
            }}
          >
            Go to settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
