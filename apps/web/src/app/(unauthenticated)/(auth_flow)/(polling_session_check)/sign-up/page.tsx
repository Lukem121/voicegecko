'use client';

import { SignUpSchema } from '@acme/auth/schemas/auth';
import { getAuthErrorMessage } from '@acme/auth/utils/auth-error-messages';
import VoiceGeckoLogo from '@acme/ui/components/logos/logo-full';
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
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { z } from 'zod/v4';
import { useGTM } from '~/hooks/use-gtm';
import { usePostHog } from '~/hooks/use-posthog';
import { authClient } from '~/lib/auth/client';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { APP_ROUTES, buildUrl } from '~/utils/app-routes';
import { SocialSignInButton } from '../../../components/social-sign-in-button';
import TermsAndPrivacyNotice from '../../../components/terms-and-privacy-notice';
import { useSocialAuth } from '../../../hooks/use-social-auth';

const isEmailError = (code: string) => {
  if (code === 'USER_ALREADY_EXISTS') {
    return true;
  }
  if (code.toLowerCase().includes('email')) {
    return true;
  }
  return false;
};

const isUsernameError = (code: string) => {
  if (code.toLowerCase().includes('username')) {
    return true;
  }
  return false;
};

type LoadingState = {
  email: boolean;
};

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL =
    searchParams.get('redirect') ?? APP_ROUTES.MARKETING.PRICING;
  const { trackEvent } = useGTM();
  const { trackEvent: trackPostHogEvent } = usePostHog();

  const [isLoading, setIsLoading] = useState<LoadingState>({
    email: false,
  });

  const {
    signIn: socialSignIn,
    isLoading: socialLoading,
    error: providerError,
    loading: isSocialLoading,
  } = useSocialAuth({
    callbackURL,
  });

  // Enhanced social sign in with tracking
  const handleSocialSignIn = async (provider: 'discord' | 'google') => {
    trackEvent({
      event: 'signup_initiated',
      form_location: 'sign-up-page',
      method: provider as 'google' | 'github' | 'email',
      timestamp: new Date().toISOString(),
    });

    // PostHog tracking
    trackPostHogEvent({
      event: 'signup_initiated',
      form_location: 'sign-up-page',
      method: provider,
      source: POSTHOG_SOURCES.ORGANIC,
      timestamp: new Date().toISOString(),
    });

    await socialSignIn(provider);
  };

  // Track signup initiated when component loads
  useEffect(() => {
    trackEvent({
      event: 'signup_initiated',
      form_location: 'sign-up-page',
      method: 'email',
      timestamp: new Date().toISOString(),
    });

    // PostHog tracking
    trackPostHogEvent({
      event: 'signup_initiated',
      form_location: 'sign-up-page',
      method: 'email',
      source: POSTHOG_SOURCES.ORGANIC,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent, trackPostHogEvent]);

  const loading = isLoading.email || isSocialLoading;

  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: '',
      username: '',
      name: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof SignUpSchema>) => {
    const { error: signUpError } = await authClient.signUp.email({
      callbackURL,
      email: values.email,
      username: values.username,
      name: values.name,
      password: values.password,
      fetchOptions: {
        onSuccess: () => {
          // Track successful signup completion
          trackEvent({
            event: 'signup_completed',
            user_id: `temp_user_${Date.now()}`,
            method: 'email',
            plan_type: 'free',
            timestamp: new Date().toISOString(),
          });

          // Also track generate_lead for Google Ads
          trackEvent({
            event: 'generate_lead',
            user_id: `temp_user_${Date.now()}`,
            value: 0,
            currency: 'USD',
            timestamp: new Date().toISOString(),
          });

          // PostHog tracking
          trackPostHogEvent({
            event: 'signup_completed',
            method: 'email',
            plan_type: 'free',
            source: POSTHOG_SOURCES.ORGANIC,
            user_id: `temp_user_${Date.now()}`,
            timestamp: new Date().toISOString(),
          });

          trackPostHogEvent({
            event: 'generate_lead',
            value: 0,
            currency: 'USD',
            source: POSTHOG_SOURCES.ORGANIC,
            user_id: `temp_user_${Date.now()}`,
            timestamp: new Date().toISOString(),
          });

          router.push(
            buildUrl(APP_ROUTES.AUTH.VERIFY_EMAIL, {
              email: values.email,
              redirect: callbackURL,
            })
          );
        },
        onRequest: () => {
          setError(null);
          setIsLoading((prev) => ({ ...prev, email: true }));
        },
      },
    });

    if (!signUpError) {
      return;
    }

    setIsLoading((prev) => ({ ...prev, email: false }));

    if (signUpError.code) {
      const errorMessage = getAuthErrorMessage(signUpError.code, 'en');

      if (isUsernameError(signUpError.code)) {
        form.setError('username', {
          message: errorMessage,
        });
        return;
      }

      if (isEmailError(signUpError.code)) {
        form.setError('email', {
          message: errorMessage,
        });
        return;
      }

      setError(errorMessage);
    }
  };

  return (
    <>
      <div className={'flex flex-col gap-4'}>
        <Card>
          <CardHeader className="items-start">
            <VoiceGeckoLogo className="h-10" />
            <CardDescription>
              sign up to continue to{' '}
              <span className="font-bold font-mono">voicegecko</span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete="username"
                                inputMode="text"
                                placeholder="johndoe"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete="email"
                                inputMode="email"
                                placeholder="john@example.com"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete="name"
                                inputMode="text"
                                placeholder="John Doe"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center">
                              <FormLabel>Password</FormLabel>
                            </div>
                            <FormControl>
                              <Input
                                autoComplete="password"
                                inputMode="text"
                                type="password"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="passwordConfirmation"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center">
                              <FormLabel>Confirm Password</FormLabel>
                            </div>
                            <FormControl>
                              <Input
                                autoComplete="password"
                                inputMode="text"
                                type="password"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {error !== null && (
                        <p className="font-medium text-[0.8rem] text-red-600">
                          {error}
                        </p>
                      )}
                    </div>
                    <Button className="w-full" disabled={loading} type="submit">
                      {isLoading.email ? (
                        <Loader className={'animate-spin'} />
                      ) : (
                        'Sign Up'
                      )}
                    </Button>
                  </div>
                  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
                    <span className="relative z-10 bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <SocialSignInButton
                      isLoading={socialLoading.google}
                      onClick={() => handleSocialSignIn('google')}
                      provider="google"
                    />
                    <SocialSignInButton
                      isLoading={socialLoading.discord}
                      onClick={() => handleSocialSignIn('discord')}
                      provider="discord"
                    />
                    {providerError && (
                      <p className="text-center font-medium text-[0.8rem] text-red-600">
                        {providerError}
                      </p>
                    )}
                  </div>
                  <div className="text-center text-sm">
                    Already have an account?{' '}
                    <Link
                      className="underline underline-offset-4"
                      href={APP_ROUTES.AUTH.SIGN_IN}
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <TermsAndPrivacyNotice />
    </>
  );
}
