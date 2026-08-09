'use client';

/**
 * usePostHog Hook
 *
 * Simple React hook for PostHog event tracking with automatic user context
 */

import posthog from 'posthog-js';
import { useCallback } from 'react';
import type { PostHogEvent } from '~/lib/posthog/events';

export type UsePostHogReturn = {
  trackEvent: (event: PostHogEvent) => void;
};

export const usePostHog = (): UsePostHogReturn => {
  // Simple track event function
  const handleTrackEvent = useCallback((event: PostHogEvent) => {
    try {
      posthog?.capture(event.event, {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      });
    } catch {
      // Silently fail to prevent breaking the app
    }
  }, []);

  return {
    trackEvent: handleTrackEvent,
  };
};
