import { log } from '@acme/observability';
import { signInSocial } from '@daveyplate/better-auth-tauri';
import { useState } from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { authClient } from '~/lib/client';

export type SocialProvider = 'discord' | 'google';

interface LoadingState {
  discord: boolean;
  google: boolean;
}

interface UseSocialAuthReturn {
  isLoading: LoadingState;
  error: string | null;
  signIn: (provider: SocialProvider) => Promise<void>;
  loading: boolean;
}

export function useSocialAuth(): UseSocialAuthReturn {
  const [isLoading, setIsLoading] = useState<LoadingState>({
    discord: false,
    google: false,
  });
  const [error, setError] = useState<string | null>(null);

  const loading = Object.values(isLoading).some(Boolean);

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
      errorCallbackURL: '/authentication-error',
      fetchOptions: {
        onError: ({ error: callbackError }) => setError(callbackError.message),
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
