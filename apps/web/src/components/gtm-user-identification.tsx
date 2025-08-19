'use client';

import { log } from '@acme/observability/log';
import { sendGTMEvent } from '@next/third-parties/google';
import { useEffect, useRef } from 'react';
import { useUser } from '~/hooks/auth';

/**
 * Client-side component that identifies authenticated users to Google Tag Manager
 * for Enhanced Conversions attribution. This bridges the gap between OAuth login
 * (no email form) and server-side purchase events.
 */
export function GTMUserIdentification() {
  const user = useUser();
  const identifiedUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Only identify if user is authenticated and we haven't identified this user yet
    if (user?.email && identifiedUserRef.current !== user.id) {
      try {
        // Send user identification event for Enhanced Conversions
        sendGTMEvent({
          event: 'user_identification',
          user_id: user.id,
          user_data: {
            email_address: user.email, // Google will hash this automatically
          },
          custom_parameters: {
            user_verified: user.emailVerified,
          },
        });

        // Mark this user as identified to prevent duplicate events
        identifiedUserRef.current = user.id;
      } catch (error) {
        log.error('[GTM] Failed to identify user:', error);
      }
    }
  }, [user]);

  // This component doesn't render anything
  return null;
}
