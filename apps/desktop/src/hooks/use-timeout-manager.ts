import { useCallback, useEffect, useRef } from 'react';

import type {
  TimeoutState,
  UseTimeoutManagerReturn,
} from '~/components/gecko-bar/gecko-bar-app.types';

export function useTimeoutManager(): UseTimeoutManagerReturn {
  const timeoutsRef = useRef<TimeoutState>({
    expand: null,
    collapse: null,
    tooltip: null,
    cleanup: null,
  });

  const clearTimeout = useCallback((type: keyof TimeoutState) => {
    const timeoutId = timeoutsRef.current[type];
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current[type] = null;
    }
  }, []);

  const clearAllTimeouts = useCallback(() => {
    for (const key of Object.keys(timeoutsRef.current)) {
      clearTimeout(key as keyof TimeoutState);
    }
  }, [clearTimeout]);

  const setTimeout = useCallback(
    (type: keyof TimeoutState, callback: () => void, delay: number) => {
      // Clear existing timeout of this type first
      clearTimeout(type);

      // Set new timeout
      const timeoutId = window.setTimeout(callback, delay);
      timeoutsRef.current[type] = timeoutId;
    },
    [clearTimeout]
  );

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    timeouts: timeoutsRef.current,
    clearTimeout,
    clearAllTimeouts,
    setTimeout,
  };
}
