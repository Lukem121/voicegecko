import type { z } from "zod/v4";
import { useState } from "react";

import type { SignUpSchema } from "@acme/auth/schemas";
import { authClient } from "@acme/auth/client";

import { getClientAuthErrorMessage } from "~/utils/client-error-messages";

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
              const errorMessage = getClientAuthErrorMessage(error.code, "en");
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
          const errorMessage = getClientAuthErrorMessage(
            signUpError.code,
            "en",
          );
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

const formatBanMessage = (reason: string | null, expires: Date | null) => {
  let errorMessage = "You have been banned.";
  if (reason && expires) {
    errorMessage = `You have been banned for ${reason}, expires in ${countdown(expires)}.`;
  } else if (reason) {
    errorMessage = `You have been banned for ${reason}.`;
  } else if (expires) {
    errorMessage = `You have been banned for ${countdown(expires)}.`;
  }
  return errorMessage;
};

function countdown(expires: Date): string {
  const now = new Date();
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return "expired";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  } else {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
}
