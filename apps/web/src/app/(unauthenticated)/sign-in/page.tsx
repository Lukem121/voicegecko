"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader } from "lucide-react";

import { authClient } from "@acme/auth/client";
import { SignInSchema } from "@acme/auth/schemas";
import { getAuthErrorMessage } from "@acme/auth/utils";
import VoiceGeckoLogo from "@acme/ui/components/logos/voice-gecko";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@acme/ui/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@acme/ui/components/ui/form";
import { Input } from "@acme/ui/components/ui/input";

import { useTRPC } from "~/trpc/react";
import { APP_ROUTES } from "~/utils/app-routes";
import { countdown } from "~/utils/countdown";
import { SocialSignInButton } from "../components/social-sign-in-button";
import TermsAndPrivacyNotice from "../components/terms-and-privacy-notice";
import { useSocialAuth } from "../hooks/use-social-auth";

// Types
interface SignInFormValues {
  email: string;
  password: string;
}

interface LoadingState {
  email: boolean;
}

export default function SignIn() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("redirect") ?? APP_ROUTES.HOME;

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
  } = useSocialAuth({
    callbackURL,
  });

  const loading = isLoading.email || isSocialLoading;

  const form = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: SignInFormValues) => {
    setIsLoading((prev) => ({ ...prev, email: true }));
    setError(null);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      fetchOptions: {
        onSuccess: () => router.push(callbackURL),
      },
    });

    if (!error) {
      return;
    }

    setIsLoading((prev) => ({ ...prev, email: false }));

    if (error.code === "FAILED_TO_CREATE_SESSION") {
      const status = await getBanStatus.mutateAsync(values.email);

      if (!status) {
        setError("An unexpected error occurred.");
        return;
      }

      if (status.isBanned) {
        setError(formatBanMessage(status.reason, status.expiresAt));
        return;
      }
    }

    if (error.code) {
      setError(getAuthErrorMessage(error.code, "en"));
      return;
    }

    setError("An unexpected error occurred.");
  };

  return (
    <main className="container mx-auto max-w-md px-4 py-8">
      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3">
            <VoiceGeckoLogo className="h-10" aria-label="Voice Gecko Logo" />
            <CardDescription className="text-center">
              Sign in to continue to{" "}
              <span className="font-mono font-bold">voicegecko</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
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
                            id="email"
                            type="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                            aria-describedby="email-error"
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
                          <Link
                            href={APP_ROUTES.AUTH.FORGOT_PASSWORD}
                            className="text-primary focus:ring-primary text-xs hover:underline focus:ring-2 focus:outline-none sm:text-sm"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            disabled={loading}
                            aria-describedby="password-error"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage id="password-error" />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div
                      className="bg-destructive/10 rounded-md p-3 text-sm text-red-500"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                    aria-label={isLoading.email ? "Signing in..." : "Sign in"}
                  >
                    {isLoading.email ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="border-border w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background text-muted-foreground px-2">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <SocialSignInButton
                    provider="discord"
                    isLoading={socialLoading.discord}
                    onClick={() => handleSocialSignIn("discord")}
                    disabled={loading}
                  />

                  {providerError && (
                    <div
                      className="text-destructive text-center text-sm"
                      role="alert"
                    >
                      {providerError}
                    </div>
                  )}

                  <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link
                      href={APP_ROUTES.AUTH.SIGN_UP}
                      className="text-primary focus:ring-primary hover:underline focus:ring-2 focus:outline-none"
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
