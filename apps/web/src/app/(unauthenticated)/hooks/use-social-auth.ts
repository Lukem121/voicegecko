import { useEffect, useRef, useState } from 'react';

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
  const timeoutRef = useRef<Record<SocialProvider, NodeJS.Timeout | null>>({
    discord: null,
    google: null,
  });

  const loading = Object.values(isLoading).some(Boolean);

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

    // Clear the timeout since the operation completed
    if (timeoutRef.current[provider]) {
      clearTimeout(timeoutRef.current[provider]);
      timeoutRef.current[provider] = null;
    }

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
