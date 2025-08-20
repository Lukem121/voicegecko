'use client';

import { log } from '@acme/observability/log';
import { clearUserIntent, retrieveUserIntent } from '@acme/ui/lib/redirection';
import { useEffect, useState } from 'react';

export type DesktopRedirectHandlerProps = {
  /** Called when a desktop redirect is initiated */
  onRedirectStart?: () => void;
  /** Called when desktop redirect fails */
  onRedirectFailed?: () => void;
  /** Called when no desktop redirect is needed */
  onNoRedirectNeeded?: () => void;
  /** Whether to auto-attempt redirect on mount */
  autoRedirect?: boolean;
};

/**
 * Component that handles redirection back to desktop app when user intent
 * indicates they came from the desktop app
 */
export function DesktopRedirectHandler({
  onRedirectStart,
  onRedirectFailed,
  onNoRedirectNeeded,
  autoRedirect = true,
}: DesktopRedirectHandlerProps) {
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    if (!autoRedirect || redirectAttempted) {
      return;
    }

    const handleDesktopRedirect = () => {
      setRedirectAttempted(true);

      // Check if there's a stored intent that indicates desktop origin
      const userIntent = retrieveUserIntent();

      if (!userIntent) {
        log.info('🔄 No stored user intent found');
        onNoRedirectNeeded?.();
        return;
      }

      // Check if the intent indicates desktop origin
      const isFromDesktop =
        userIntent.context?.source === 'desktop' ||
        userIntent.originalUrl.startsWith('voicegecko://');

      if (!isFromDesktop) {
        log.info('🔄 User intent does not indicate desktop origin');
        onNoRedirectNeeded?.();
        return;
      }

      log.info('🔄 Desktop redirect needed, attempting redirect...', {
        originalUrl: userIntent.originalUrl,
        context: userIntent.context,
      });

      onRedirectStart?.();

      try {
        let targetUrl: string;

        // Construct the desktop app URL based on the stored context
        if (userIntent.originalUrl.startsWith('voicegecko://')) {
          targetUrl = userIntent.originalUrl;
        } else {
          // Build desktop URL from context
          const feature = userIntent.context?.feature || 'app';
          targetUrl = `voicegecko://${feature}`;

          // Add query parameters if there's additional metadata
          if (userIntent.context?.metadata) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(
              userIntent.context.metadata
            )) {
              params.set(key, String(value));
            }
            targetUrl += `?${params.toString()}`;
          }
        }

        log.info('🔄 Redirecting to desktop app:', targetUrl);

        // Clear the intent since we're handling it
        clearUserIntent();

        // Attempt redirect using window.location.assign for better compatibility
        window.location.assign(targetUrl);

        // Set a timeout to detect if redirect failed
        setTimeout(() => {
          log.warn('⚠️ Desktop redirect may have failed - still on web page');
          onRedirectFailed?.();
        }, 3000);
      } catch (error) {
        log.error('❌ Desktop redirect failed:', error);
        onRedirectFailed?.();
      }
    };

    // Small delay to ensure page is fully loaded
    const timeoutId = setTimeout(handleDesktopRedirect, 500);
    return () => clearTimeout(timeoutId);
  }, [
    autoRedirect,
    redirectAttempted,
    onRedirectStart,
    onRedirectFailed,
    onNoRedirectNeeded,
  ]);

  // This component doesn't render anything - it only handles logic
  return null;
}

/**
 * Hook version of the desktop redirect handler for more flexibility
 */
export function useDesktopRedirect() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  const attemptDesktopRedirect = () => {
    if (redirectAttempted) {
      return;
    }

    setRedirectAttempted(true);
    setIsRedirecting(true);
    setRedirectFailed(false);

    const userIntent = retrieveUserIntent();

    if (!userIntent) {
      setIsRedirecting(false);
      return false;
    }

    const isFromDesktop =
      userIntent.context?.source === 'desktop' ||
      userIntent.originalUrl.startsWith('voicegecko://');

    if (!isFromDesktop) {
      setIsRedirecting(false);
      return false;
    }

    try {
      let targetUrl: string;

      if (userIntent.originalUrl.startsWith('voicegecko://')) {
        targetUrl = userIntent.originalUrl;
      } else {
        const feature = userIntent.context?.feature || 'app';
        targetUrl = `voicegecko://${feature}`;

        if (userIntent.context?.metadata) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(
            userIntent.context.metadata
          )) {
            params.set(key, String(value));
          }
          targetUrl += `?${params.toString()}`;
        }
      }

      log.info('🔄 Manual desktop redirect:', targetUrl);
      clearUserIntent();
      window.location.assign(targetUrl);

      setTimeout(() => {
        setRedirectFailed(true);
        setIsRedirecting(false);
      }, 3000);

      return true;
    } catch (error) {
      log.error('❌ Manual desktop redirect failed:', error);
      setRedirectFailed(true);
      setIsRedirecting(false);
      return false;
    }
  };

  return {
    attemptDesktopRedirect,
    isRedirecting,
    redirectFailed,
    redirectAttempted,
  };
}
