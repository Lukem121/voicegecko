'use client';

/**
 * useGTM Hook
 *
 * Simple React hook for GTM event tracking with automatic user context
 */

import { useCallback } from 'react';
import { trackEvent } from '~/lib/gtm/client';
import type { GTMEvent } from '~/lib/gtm/events';

export type UserStatus = 'anonymous' | 'free' | 'pro';

export type UseGTMReturn = {
  trackEvent: (event: GTMEvent) => void;
};

export const useGTM = (): UseGTMReturn => {
  // Simple track event function
  const handleTrackEvent = useCallback((event: GTMEvent) => {
    trackEvent({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
  }, []);

  return {
    trackEvent: handleTrackEvent,
  };
};
