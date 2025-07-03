import type { z } from "zod/v4";
import { useState } from "react";

import type { ForgotPasswordSchema } from "@acme/auth/schemas";
import { getAuthErrorMessage } from "@acme/auth/utils";

import { authClient } from "~/auth/client";

interface UseForgotPasswordOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseForgotPasswordReturn {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  requestReset: (values: z.infer<typeof ForgotPasswordSchema>) => Promise<void>;
}

export function useForgotPassword({
  onSuccess,
  onError,
}: UseForgotPasswordOptions = {}): UseForgotPasswordReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async (values: z.infer<typeof ForgotPasswordSchema>) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      // Use deep link URL for password reset callback
      // This will bring the user back to the desktop app when they click the reset link
      const deepLinkRedirectURL = `voicegecko://reset-password`;

      const { error: resetError } = await authClient.forgetPassword({
        email: values.email,
        redirectTo: deepLinkRedirectURL,
        fetchOptions: {
          onSuccess: () => {
            console.log("Password reset email sent successfully");
            setIsSuccess(true);
            onSuccess?.();
          },
          onError: ({ error }) => {
            console.error("use-forgot-password", { error });

            if (error.code) {
              const errorMessage = getAuthErrorMessage(
                error.code,
                "en",
                error.message,
              );
              setError(errorMessage);
              onError?.(errorMessage);
            } else {
              const errorMessage =
                error.message ?? "Failed to send reset email.";
              setError(errorMessage);
              onError?.(errorMessage);
            }
            setIsSuccess(false);
          },
        },
      });

      if (resetError) {
        console.error("use-forgot-password", { error: resetError });

        if (resetError.code) {
          const errorMessage = getAuthErrorMessage(
            resetError.code,
            "en",
            resetError.message,
          );
          setError(errorMessage);
          onError?.(errorMessage);
        } else {
          const errorMessage =
            resetError.message ?? "Failed to send reset email.";
          setError(errorMessage);
          onError?.(errorMessage);
        }
        setIsSuccess(false);
      }
    } catch (err) {
      console.error("use-forgot-password", { error: err });
      const errorMessage = "An unexpected error occurred.";
      setError(errorMessage);
      onError?.(errorMessage);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isSuccess,
    error,
    requestReset,
  };
}
