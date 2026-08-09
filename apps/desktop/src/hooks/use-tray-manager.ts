import { log } from '@acme/observability/log';
import { useNavigate } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef } from 'react';

import { useUsageStats } from '~/hooks/use-usage-stats';

export function useTrayManager() {
  const navigate = useNavigate();
  const updateRef = useRef<NodeJS.Timeout | null>(null);

  // Get dynamic stats data
  const {
    wordsProcessed,
    timeSaved,
    wordsPerMinute,
    isLoading: usageLoading,
  } = useUsageStats();

  // Listen for navigation events from Rust
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<string>('navigate', (event) => {
        navigate({ to: event.payload });
      });
      return unlisten;
    };

    let unlistenFn: (() => void) | null = null;

    setupListener().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [navigate]);

  // Debounced tray update function
  const updateTrayStats = useCallback(
    async (
      wordsCount: string,
      timeSavedParam: string,
      wordsPerMinuteParam: string
    ) => {
      try {
        await invoke('update_tray_stats', {
          wordsCount,
          timeSaved: timeSavedParam,
          wordsPerMinute: wordsPerMinuteParam,
        });
      } catch (error) {
        log.error(error, 'Failed to update tray stats:');
      }
    },
    []
  );

  // Debounced update to prevent excessive calls
  const debouncedUpdate = useCallback(
    (
      wordsCount: string,
      timeSavedParam: string,
      wordsPerMinuteParam: string
    ) => {
      if (updateRef.current !== null) {
        clearTimeout(updateRef.current);
      }
      updateRef.current = setTimeout(() => {
        updateTrayStats(wordsCount, timeSavedParam, wordsPerMinuteParam);
      }, 500); // 500ms debounce
    },
    [updateTrayStats]
  );

  // Update tray when usage stats change
  useEffect(() => {
    if (!usageLoading) {
      const formattedWordsProcessed = wordsProcessed || '0';
      const formattedTimeSaved = timeSaved || '0 min';
      const formattedWordsPerMinute = wordsPerMinute || '—';

      debouncedUpdate(
        formattedWordsProcessed,
        formattedTimeSaved,
        formattedWordsPerMinute
      );
    }
  }, [
    wordsProcessed,
    timeSaved,
    wordsPerMinute,
    usageLoading,
    debouncedUpdate,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateRef.current !== null) {
        clearTimeout(updateRef.current);
      }
    };
  }, []);

  return {
    // No state needed - tray is managed entirely in Rust
    isReady: !usageLoading,
  };
}
