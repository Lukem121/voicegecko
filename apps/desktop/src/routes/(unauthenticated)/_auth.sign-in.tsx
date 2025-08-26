import { SignInSchema } from '@acme/auth/schemas/auth';
import LogoFull from '@acme/ui/components/logos/logo-full';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@acme/ui/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from '@acme/ui/components/ui/form';
import { Input } from '@acme/ui/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Loader } from 'lucide-react';
import { useState } from 'react';

import { authClient } from '~/lib/client';
import { useAuthError } from '~/stores/auth.store';
import { trpc } from '~/trpc';
import { getClientAuthErrorMessage } from '~/utils/client-error-messages';
import { countdown } from '../../utils/countdown';
import { SocialSignInButton } from './-components/social-sign-in-button';
import TermsAndPrivacyNotice from './-components/terms-and-privacy-notice';
import { useSocialAuth } from './-hooks/use-social-auth';

export const Route = createFileRoute('/(unauthenticated)/_auth/sign-in')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string | undefined) ?? null,
    };
  },
  component: SignIn,
});

// Types
type SignInFormValues = {
  email: string;
  password: string;
};

type LoadingState = {
  email: boolean;
};

function SignIn() {
  const router = useRouter();
  const search = Route.useSearch();
  const callbackURL = search.redirect ?? '/';
  const storeError = useAuthError();

  const getBanStatus = useMutation(trpc.auth.getBanStatus.mutationOptions());

  const [isLoading, setIsLoading] = useState<LoadingState>({
    email: false,
  });
  const [error, setError] = useState<string | null>(null);

  const {
    signIn: handleSocialSignIn,
    isLoading: socialLoading,
    error: providerError,
    loading: isSocialLoading,
  } = useSocialAuth(); // Remove callbackURL - let Tauri plugin handle deep links

  const loading = isLoading.email || isSocialLoading;

  const form = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (values: SignInFormValues) => {
    setIsLoading((prev) => ({ ...prev, email: true }));
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      fetchOptions: {
        onSuccess: () => router.navigate({ to: callbackURL }),
      },
    });

    if (!signInError) {
      return;
    }

    setIsLoading((prev) => ({ ...prev, email: false }));

    if (signInError.code === 'FAILED_TO_CREATE_SESSION') {
      const status = await getBanStatus.mutateAsync(values.email);

      if (!status) {
        setError('An unexpected error occurred.');
        return;
      }

      if (status.isBanned) {
        setError(formatBanMessage(status.reason, status.expiresAt));
        return;
      }
    }

    if (signInError.code) {
      setError(getClientAuthErrorMessage(signInError.code, 'en'));
      return;
    }

    setError('An unexpected error occurred.');
  };

  return (
    <main className="container mx-auto max-w-md px-4 py-8">
      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3">
            <LogoFull aria-label="VoiceGecko Logo" className="mx-auto h-10" />
            <CardDescription className="text-center">
              Sign in to continue to{' '}
              <span className="font-bold font-mono">VoiceGecko</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="space-y-6"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="email">Email address</FormLabel>
                        <FormControl>
                          <Input
                            aria-describedby="email-error"
                            autoComplete="email"
                            disabled={loading}
                            id="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage id="email-error" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel htmlFor="password">Password</FormLabel>
                          <button
                            className="cursor-pointer text-primary text-xs hover:underline focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                            onClick={() => {
                              openUrl(
                                `${import.meta.env.VITE_PUBLIC_VOICEGECKO_URL}/forgot-password`
                              );
                            }}
                            type="button"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <Input
                            aria-describedby="password-error"
                            autoComplete="current-password"
                            disabled={loading}
                            id="password"
                            type="password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage id="password-error" />
                      </FormItem>
                    )}
                  />

                  {(storeError || error) && (
                    <div
                      className="rounded-md bg-destructive/10 p-3 text-red-500 text-sm"
                      role="alert"
                    >
                      {storeError ?? error}
                    </div>
                  )}

                  <Button
                    aria-label={isLoading.email ? 'Signing in...' : 'Sign in'}
                    className="w-full"
                    disabled={loading}
                    type="submit"
                  >
                    {isLoading.email ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-border border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <SocialSignInButton
                    disabled={loading}
                    isLoading={socialLoading.google}
                    onClick={() => handleSocialSignIn('google')}
                    provider="google"
                  />
                  <SocialSignInButton
                    disabled={loading}
                    isLoading={socialLoading.discord}
                    onClick={() => handleSocialSignIn('discord')}
                    provider="discord"
                  />

                  {providerError && (
                    <div
                      className="text-center text-destructive text-sm"
                      role="alert"
                    >
                      {providerError}
                    </div>
                  )}

                  <div className="text-center text-sm">
                    Don&apos;t have an account?{' '}
                    <Link
                      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
                      search={{ redirect: callbackURL }}
                      to="/sign-up"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <TermsAndPrivacyNotice />
      </div>
    </main>
  );
}

const formatBanMessage = (reason: string | null, expires: Date | null) => {
  let errorMessage = 'You have been banned.';
  if (reason && expires) {
    errorMessage = `You have been banned for ${reason}, expires in ${countdown(expires)}.`;
  } else if (reason) {
    errorMessage = `You have been banned for ${reason}.`;
  } else if (expires) {
    errorMessage = `You have been banned for ${countdown(expires)}.`;
  }
  return errorMessage;
};
