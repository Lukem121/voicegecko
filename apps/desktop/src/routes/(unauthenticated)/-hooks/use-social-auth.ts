import { useState } from "react";
import { signInSocial } from "@daveyplate/better-auth-tauri";

import { analytics } from "~/lib/analytics/posthog-analytics";
import { authClient } from "~/lib/client";

export type SocialProvider = "discord" | "google";

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
    analytics.track("user_signed_in", {
      method: provider,
      returning_user: true, // Could be enhanced with proper detection
    });

    const { error } = await signInSocial({
      authClient,
      provider,
      errorCallbackURL: "/authentication-error",
      fetchOptions: {
        onError: ({ error }) => setError(error.message),
      },
    });

    if (error) {
      console.error("use-social-auth", { error });
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
