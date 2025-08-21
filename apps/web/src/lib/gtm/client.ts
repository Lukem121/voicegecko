'use client';

/**
 * GTM Client Helper
 *
 * Simple wrapper around Next.js's sendGTMEvent with error handling
 */

import { sendGTMEvent } from '@next/third-parties/google';
import type { GTMEvent } from './events';

/**
 * Send an event to Google Tag Manager
 */
export const trackEvent = (event: GTMEvent): void => {
  try {
    sendGTMEvent(event);
  } catch {
    // Silently fail to prevent breaking the app
  }
};
