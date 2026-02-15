'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useState } from 'react';

import { authClient } from '~/lib/auth/client';
import { APP_ROUTES } from '~/utils/app-routes';

// Constants
const COUNTDOWN_TIME = 30;

// Types
type VerificationState = {
  isLoading: boolean;
  resendDisabled: boolean;
  timer: number;
  message: string | null;
  error: string | null;
};

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
      await authClient.sendVerificationEmail(
        { email, callbackURL: redirect },
        {
          onSuccess: () => {
            setState((prev) => ({
              ...prev,
              message: 'Verification email has been resent.',
              isLoading: false,
            }));
            startCountdown();
          },
          onError: (error) => {
            setState((prev) => ({
              ...prev,
              error:
                error.error.message ||
                'Failed to send verification email. Please try again.',
              isLoading: false,
            }));
          },
        }
      );
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'An unexpected error occurred. Please try again.',
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
export default function VerifyEmail() {
  const [email] = useQueryState('email');
  const [redirect] = useQueryState(
    'redirect',
    parseAsString.withDefault(APP_ROUTES.HOME)
  );
  const { state, handleResend } = useVerification(email, redirect);

  return (
    <main className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verify Your Email</CardTitle>
          <CardDescription>
            We have sent you an email with a link to verify your email and sign
            in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {state.message && (
            <output
              aria-live="polite"
              className="text-center text-green-600 text-sm"
            >
              {state.message}
            </output>
          )}
          {state.error && (
            <p
              aria-live="assertive"
              className="text-center text-red-600 text-sm"
              role="alert"
            >
              {state.error}
            </p>
          )}
          {email !== null && (
            <Button
              aria-busy={state.isLoading}
              className="w-full"
              disabled={state.resendDisabled || state.isLoading}
              onClick={handleResend}
              variant="secondary"
            >
              {state.isLoading ? (
                <>
                  <Loader aria-hidden="true" className="mr-2 animate-spin" />
                  <span className="sr-only">Sending verification email...</span>
                </>
              ) : (
                'Resend Verification Email'
              )}
              {state.resendDisabled && !state.isLoading && ` (${state.timer}s)`}
            </Button>
          )}
          <Link
            className="mt-4 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            href={`${APP_ROUTES.AUTH.SIGN_IN}?redirect=${encodeURIComponent(redirect)}`}
          >
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
