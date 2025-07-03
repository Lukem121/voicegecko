import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/(unauthenticated)/_auth/verify-email")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: search.redirect as string,
      email: search.email as string,
    };
  },
  component: VerifyEmail,
});

// Constants
const COUNTDOWN_TIME = 30;

// Types
interface VerificationState {
  isLoading: boolean;
  resendDisabled: boolean;
  timer: number;
  message: string | null;
  error: string | null;
}

// Custom hook for verification logic
const useVerification = (email: string | null, redirect: string) => {
  const [state, setState] = useState<VerificationState>({
    isLoading: false,
    resendDisabled: true,
    timer: COUNTDOWN_TIME,
    message: null,
    error: null,
  });

  const startCountdown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      resendDisabled: true,
      timer: COUNTDOWN_TIME,
    }));
  }, []);

  const handleResend = async () => {
    if (!email) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      message: null,
    }));

    try {
      // Use deep link URL for email verification callback
      const deepLinkCallbackURL = `voicegecko://verify-success?redirect=${encodeURIComponent(redirect)}`;

      await authClient.sendVerificationEmail(
        { email, callbackURL: deepLinkCallbackURL },
        {
          onSuccess: () => {
            setState((prev) => ({
              ...prev,
              message: "Verification email has been resent.",
              isLoading: false,
            }));
            startCountdown();
          },
          onError: (error) => {
            setState((prev) => ({
              ...prev,
              error:
                error.error.message ||
                "Failed to send verification email. Please try again.",
              isLoading: false,
            }));
          },
        },
      );
    } catch {
      setState((prev) => ({
        ...prev,
        error: "An unexpected error occurred. Please try again.",
        isLoading: false,
      }));
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.resendDisabled) {
      interval = setInterval(() => {
        setState((prev) => {
          if (prev.timer <= 1) {
            clearInterval(interval);
            return {
              ...prev,
              resendDisabled: false,
              timer: COUNTDOWN_TIME,
            };
          }
          return {
            ...prev,
            timer: prev.timer - 1,
          };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state.resendDisabled]);

  useEffect(() => {
    startCountdown();
  }, [startCountdown]);

  return { state, handleResend };
};

// Main component
function VerifyEmail() {
  const search = Route.useSearch();
  const email = search.email;
  const redirect = search.redirect;
  const { state, handleResend } = useVerification(email, redirect);

  return (
    <main className="flex flex-col gap-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verify Your Email</CardTitle>
          <CardDescription>
            We have sent you an email with a link to verify your email and sign
            in. The verification link will redirect you back to the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {state.message && (
            <output
              className="text-center text-sm text-green-600"
              aria-live="polite"
            >
              {state.message}
            </output>
          )}
          {state.error && (
            <p
              className="text-center text-sm text-red-600"
              role="alert"
              aria-live="assertive"
            >
              {state.error}
            </p>
          )}
          {email !== null && (
            <Button
              onClick={handleResend}
              disabled={state.resendDisabled || state.isLoading}
              variant="secondary"
              className="w-full"
              aria-busy={state.isLoading}
            >
              {state.isLoading ? (
                <>
                  <Loader className="mr-2 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Sending verification email...</span>
                </>
              ) : (
                "Resend Verification Email"
              )}
              {state.resendDisabled && !state.isLoading && ` (${state.timer}s)`}
            </Button>
          )}
          <Link
            to="/sign-in"
            search={{ redirect }}
            className="focus:ring-primary mt-4 text-sm hover:underline focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
