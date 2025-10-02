import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';

export function useFullscreenDetection(enabled = true) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // State stabilization - require consistent state across multiple checks
  const stateHistoryRef = useRef<boolean[]>([]);
  const REQUIRED_CONSISTENT_CHECKS = 3; // State must be stable for 3 checks
  const CHECK_INTERVAL_MS = 800; // Check every 800ms

  // Track the last confirmed state to prevent unnecessary updates
  const lastConfirmedStateRef = useRef<boolean>(false);

  // Prevent multiple simultaneous checks
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) {
      // Cleanup when disabled
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsMonitoring(false);
      stateHistoryRef.current = [];
      return;
    }

    const checkFullscreen = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) {
        return;
      }

      isCheckingRef.current = true;

      try {
        const fullscreenActive = await invoke<boolean>(
          'is_fullscreen_app_active'
        );

        // Add to state history
        stateHistoryRef.current.push(fullscreenActive);

        // Keep only the last N checks
        if (stateHistoryRef.current.length > REQUIRED_CONSISTENT_CHECKS) {
          stateHistoryRef.current.shift();
        }

        // Check if we have enough history
        if (stateHistoryRef.current.length >= REQUIRED_CONSISTENT_CHECKS) {
          // Check if all recent states are consistent
          const allTrue = stateHistoryRef.current.every(
            (state) => state === true
          );
          const allFalse = stateHistoryRef.current.every(
            (state) => state === false
          );

          let confirmedState: boolean | null = null;
          if (allTrue) {
            confirmedState = true;
          } else if (allFalse) {
            confirmedState = false;
          }

          // Only update if we have a confirmed state and it's different from the last one
          if (
            confirmedState !== null &&
            confirmedState !== lastConfirmedStateRef.current
          ) {
            lastConfirmedStateRef.current = confirmedState;
            setIsFullscreen(confirmedState);

            // Track fullscreen state changes
            analytics.track('gecko_bar_visibility_changed', {
              visible: !confirmedState,
              trigger: 'fullscreen',
            });

            // Update gecko bar visibility based on fullscreen state
            if (confirmedState) {
              // Hide gecko bar when entering fullscreen
              try {
                await invoke('hide_gecko_bar');
              } catch (error) {
                log.error(error, 'Failed to hide gecko bar:');
              }
            } else {
              // Show gecko bar when exiting fullscreen
              try {
                await invoke('show_gecko_bar');
              } catch (error) {
                log.error(error, 'Failed to show gecko bar:');
              }
            }
          }
        }
      } catch (error) {
        log.error(error, 'Failed to check fullscreen state:');
        // Clear history on error to prevent stale state
        stateHistoryRef.current = [];
      } finally {
        isCheckingRef.current = false;
      }
    };

    setIsMonitoring(true);

    // Check immediately
    checkFullscreen();

    // Set up interval
    intervalIdRef.current = setInterval(checkFullscreen, CHECK_INTERVAL_MS);

    // Cleanup on unmount or when enabled changes
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsMonitoring(false);
      stateHistoryRef.current = [];
      isCheckingRef.current = false;
    };
  }, [enabled]);

  return {
    isFullscreen,
    isMonitoring,
  };
}
