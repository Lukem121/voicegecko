import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';

export function useFullscreenDetection(enabled = true) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  const checkFullscreen = useCallback(async () => {
    try {
      const now = Date.now();
      // Debounce to prevent too frequent checks
      if (now - lastCheckTimeRef.current < 500) {
        return;
      }
      lastCheckTimeRef.current = now;

      const fullscreenActive = await invoke<boolean>(
        'is_fullscreen_app_active'
      );

      if (fullscreenActive !== isFullscreen) {
        setIsFullscreen(fullscreenActive);

        // Track fullscreen state changes
        analytics.track('gecko_bar_visibility_changed', {
          visible: !fullscreenActive,
          trigger: 'fullscreen',
        });

        // Update gecko bar visibility based on fullscreen state
        if (fullscreenActive) {
          // Hide gecko bar when entering fullscreen
          try {
            await invoke('hide_gecko_bar');
          } catch (error) {
            log.error(error, 'Failed to hide gecko bar:');
          }
        } else {
          // Show gecko bar when exiting fullscreen (backend will check if it should be visible)
          // Add a small delay to ensure window state has settled
          setTimeout(async () => {
            try {
              await invoke('show_gecko_bar');
            } catch (error) {
              log.error(error, 'Failed to show gecko bar:');
            }
          }, 1000); // Increased delay to ensure window state has settled
        }
      }
    } catch (error) {
      log.error(error, 'Failed to check fullscreen state:');
    }
  }, [isFullscreen]);

  useEffect(() => {
    const startMonitoring = () => {
      if (intervalIdRef.current || !enabled) {
        return;
      }

      setIsMonitoring(true);

      // Check immediately
      checkFullscreen();

      // Check more frequently (every 1 second) for better responsiveness
      intervalIdRef.current = setInterval(checkFullscreen, 1000);
    };

    const stopMonitoring = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsMonitoring(false);
      // Don't reset isFullscreen state here - let it reflect actual state
    };

    // Start monitoring when enabled
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [enabled, checkFullscreen]);

  return {
    isFullscreen,
    isMonitoring,
  };
}
