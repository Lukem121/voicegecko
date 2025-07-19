import { useState } from "react";

import { authClient } from "~/lib/auth/client";
import { APP_ROUTES } from "~/utils/app-routes";

export type SocialProvider = "discord" | "google";

interface LoadingState {
  discord: boolean;
  google: boolean;
}

interface UseSocialAuthOptions {
  callbackURL: string;
}

interface UseSocialAuthReturn {
  isLoading: LoadingState;
  error: string | null;
  signIn: (provider: SocialProvider) => Promise<void>;
  loading: boolean;
}

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

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: APP_ROUTES.AUTH.ERROR,
      fetchOptions: {
        onError: ({ error }) => setError(error.message),
      },
    });

    if (error) {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
      setError(error.message ?? "An unexpected error occurred.");
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
