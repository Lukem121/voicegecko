import type { FetchError } from '@acme/auth/tauri';
import { signInSocial } from '@acme/auth/tauri/social';
import { log } from '@acme/observability/log';
import { useEffect, useRef, useState } from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { authClient } from '~/lib/client';
import { useAuthError } from '~/stores/auth.store';

export type SocialProvider = 'discord' | 'google';

type LoadingState = {
  discord: boolean;
  google: boolean;
};

type UseSocialAuthReturn = {
  isLoading: LoadingState;
  error: string | null;
  signIn: (provider: SocialProvider) => Promise<void>;
  loading: boolean;
};

export function useSocialAuth(): UseSocialAuthReturn {
  const [isLoading, setIsLoading] = useState<LoadingState>({
    discord: false,
    google: false,
  });
  const [error, setError] = useState<string | null>(null);
  const storeAuthError = useAuthError();
  const timeoutRef = useRef<Record<SocialProvider, NodeJS.Timeout | null>>({
    discord: null,
    google: null,
  });

  const loading = Object.values(isLoading).some(Boolean);

  // Stop spinner if a global auth error occurs (e.g., rate-limited via deep link)
  useEffect(() => {
    if (storeAuthError) {
      setIsLoading({ discord: false, google: false });
    }
  }, [storeAuthError]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      for (const timeout of Object.values(timeoutRef.current)) {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    };
  }, []);

  const signIn = async (provider: SocialProvider) => {
    // Clear any existing timeout for this provider
    if (timeoutRef.current[provider]) {
      clearTimeout(timeoutRef.current[provider]);
      timeoutRef.current[provider] = null;
    }

    setIsLoading((prev) => ({ ...prev, [provider]: true }));
    setError(null);

    // Set timeout to clear loading state after 3 seconds
    timeoutRef.current[provider] = setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
      timeoutRef.current[provider] = null;
    }, 3000);

    // Track social sign-in attempt
    analytics.track('user_signed_in', {
      method: provider,
      returning_user: true, // Could be enhanced with proper detection
    });

    const { error: signInError } = await signInSocial({
      authClient,
      provider,
      fetchOptions: {
        onError: ({ error: callbackError }: { error: FetchError }) =>
          setError(callbackError.message ?? 'An unexpected error occurred'),
      },
    });

    // Clear the timeout since the operation completed
    if (timeoutRef.current[provider]) {
      clearTimeout(timeoutRef.current[provider]);
      timeoutRef.current[provider] = null;
    }

    if (signInError) {
      log.error('use-social-auth', { error: signInError });
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
      setError(signInError.message ?? 'An unexpected error occurred.');
      return;
    }

    // Clear loading state on success too (though this should happen via redirect)
    setIsLoading((prev) => ({ ...prev, [provider]: false }));
  };

  return {
    isLoading,
    error,
    signIn,
    loading,
  };
}
