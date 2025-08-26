import type { FetchError } from '@acme/auth/tauri';
import { signInSocial } from '@acme/auth/tauri/social';
import { log } from '@acme/observability/log';
import { useEffect, useState } from 'react';

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

  const loading = Object.values(isLoading).some(Boolean);

  // Stop spinner if a global auth error occurs (e.g., rate-limited via deep link)
  useEffect(() => {
    if (storeAuthError) {
      setIsLoading({ discord: false, google: false });
    }
  }, [storeAuthError]);

  const signIn = async (provider: SocialProvider) => {
    setIsLoading((prev) => ({ ...prev, [provider]: true }));
    setError(null);

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

    if (signInError) {
      log.error('use-social-auth', { error: signInError });
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
      setError(signInError.message ?? 'An unexpected error occurred.');
      return;
    }
  };

  return {
    isLoading,
    error,
    signIn,
    loading,
  };
}
