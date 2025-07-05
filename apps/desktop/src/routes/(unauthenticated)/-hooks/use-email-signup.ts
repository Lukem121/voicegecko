import type { z } from "zod/v4";
import { useState } from "react";

import type { SignUpSchema } from "@acme/auth/schemas";
import { authClient } from "@acme/auth/client";
import { getAuthErrorMessage } from "@acme/auth/utils";

interface UseEmailSignupOptions {
  callbackURL: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseEmailSignupReturn {
  isLoading: boolean;
  error: string | null;
  signUp: (
    values: z.infer<typeof SignUpSchema>,
  ) => Promise<{ success: boolean }>;
}

export function useEmailSignup({
  callbackURL,
  onSuccess,
  onError,
}: UseEmailSignupOptions): UseEmailSignupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = async (values: z.infer<typeof SignUpSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use deep link URL for email verification callback
      // This works with the existing useBetterAuthTauri hook in __root.tsx
      const deepLinkCallbackURL = `voicegecko://verify-success?redirect=${encodeURIComponent(callbackURL)}`;

      const { error: signUpError } = await authClient.signUp.email({
        callbackURL: deepLinkCallbackURL,
        email: values.email,
        username: values.username,
        name: values.name,
        password: values.password,
        fetchOptions: {
          onSuccess: () => {
            console.log("Email signup successful, verification email sent");
            onSuccess?.();
          },
          onError: ({ error }) => {
            console.error("use-email-signup", { error });

            if (error.code) {
              const errorMessage = getAuthErrorMessage(error.code, "en");
              setError(errorMessage);
              onError?.(errorMessage);
            } else {
              const errorMessage =
                error.message ?? "An unexpected error occurred.";
              setError(errorMessage);
              onError?.(errorMessage);
            }
          },
        },
      });

      if (signUpError) {
        console.error("use-email-signup", { error: signUpError });

        if (signUpError.code) {
          const errorMessage = getAuthErrorMessage(signUpError.code, "en");
          setError(errorMessage);
          onError?.(errorMessage);
        } else {
          const errorMessage =
            signUpError.message ?? "An unexpected error occurred.";
          setError(errorMessage);
          onError?.(errorMessage);
        }

        return { success: false };
      }

      return { success: true };
    } catch (err) {
      console.error("use-email-signup", { error: err });
      const errorMessage = "An unexpected error occurred.";
      setError(errorMessage);
      onError?.(errorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    signUp,
  };
}
