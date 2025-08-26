import { useState } from 'react';

import { authClient } from '~/lib/auth/client';
import { APP_ROUTES } from '~/utils/app-routes';

export type SocialProvider = 'discord' | 'google';

type LoadingState = {
  discord: boolean;
  google: boolean;
};

type UseSocialAuthOptions = {
  callbackURL: string;
};

type UseSocialAuthReturn = {
  isLoading: LoadingState;
  error: string | null;
  signIn: (provider: SocialProvider) => Promise<void>;
  loading: boolean;
};

export function useSocialAuth({
  callbackURL,
}: UseSocialAuthOptions): UseSocialAuthReturn {
  const [isLoading, setIsLoading] = useState<LoadingState>({
    discord: false,
    google: false,
  });
  const [error, setError] = useState<string | null>(null);

  const loading = Object.values(isLoading).some(Boolean);

  const signIn = async (provider: SocialProvider) => {
    setIsLoading((prev) => ({ ...prev, [provider]: true }));
    setError(null);

    const { error: socialError } = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: APP_ROUTES.AUTH.ERROR,
      fetchOptions: {
        onError: ({ error: onError }) =>
          setError(
            onError.message ===
              'You are being rate limited for requesting too many tokens. Please try again later.'
              ? 'You are being rate limited. Please try again later.'
              : onError.message
          ),
      },
    });

    if (socialError) {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
      setError(
        socialError.message ===
          'You are being rate limited for requesting too many tokens. Please try again later.'
          ? 'You are being rate limited. Please try again later.'
          : (socialError.message ?? 'An unexpected error occurred.')
      );
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
