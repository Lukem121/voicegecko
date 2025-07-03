import { useEffect } from 'react';

const DEFAULT_POLL_INTERVAL = 5000;

/**
 * Hook to poll every `interval` milliseconds
 * @param interval - The interval in milliseconds (default: 5000)
 */
export const usePolling = (
  fn: () => void,
  interval: number = DEFAULT_POLL_INTERVAL
) => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      fn();
    }, interval);

    return () => clearInterval(intervalId);
  }, [fn, interval]);
};
