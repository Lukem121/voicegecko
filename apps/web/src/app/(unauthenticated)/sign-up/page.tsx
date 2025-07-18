"use client";

import type { z } from "zod/v4";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";

import { SignUpSchema } from "@acme/auth/schemas";
import { getAuthErrorMessage } from "@acme/auth/utils";
import VoiceGeckoLogo from "@acme/ui/components/logos/logo-full";
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

import { authClient } from "~/lib/client";
import { APP_ROUTES, buildUrl } from "~/utils/app-routes";
import { SocialSignInButton } from "../components/social-sign-in-button";
import TermsAndPrivacyNotice from "../components/terms-and-privacy-notice";
import { useSocialAuth } from "../hooks/use-social-auth";

const isEmailError = (code: string) => {
  if (code === "USER_ALREADY_EXISTS") {
    return true;
  }
  if (code.toLowerCase().includes("email")) {
    return true;
  }
  return false;
};

const isUsernameError = (code: string) => {
  if (code.toLowerCase().includes("username")) {
    return true;
  }
  return false;
};

interface LoadingState {
  email: boolean;
}

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("redirect") ?? APP_ROUTES.HOME;

  const [isLoading, setIsLoading] = useState<LoadingState>({
    email: false,
  });

  const {
    signIn: handleSocialSignIn,
    isLoading: socialLoading,
    error: providerError,
    loading: isSocialLoading,
  } = useSocialAuth({
    callbackURL,
  });

  const loading = isLoading.email || isSocialLoading;

  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: "",
      username: "",
      name: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof SignUpSchema>) => {
    const { error } = await authClient.signUp.email({
      callbackURL,
      email: values.email,
      username: values.username,
      name: values.name,
      password: values.password,
      fetchOptions: {
        onSuccess: () => {
          router.push(
            buildUrl(APP_ROUTES.AUTH.VERIFY_EMAIL, { email: values.email }),
          );
        },
        onRequest: () => {
          setError(null);
          setIsLoading((prev) => ({ ...prev, email: true }));
        },
      },
    });

    if (!error) {
      return;
    }

    setIsLoading((prev) => ({ ...prev, email: false }));

    if (error.code) {
      const errorMessage = getAuthErrorMessage(error.code, "en");

      if (isUsernameError(error.code)) {
        form.setError("username", {
          message: errorMessage,
        });
        return;
      }

      if (isEmailError(error.code)) {
        form.setError("email", {
          message: errorMessage,
        });
        return;
      }

      setError(errorMessage);
    }
  };

  return (
    <>
      <div className={"flex flex-col gap-4"}>
        <Card>
          <CardHeader className="items-start">
            <VoiceGeckoLogo className="h-10" />
            <CardDescription>
              sign up to continue to{" "}
              <span className="font-mono font-bold">voicegecko</span>
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
                                placeholder="johndoe"
                                autoComplete="username"
                                inputMode="text"
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
                                inputMode="email"
                                placeholder="john@example.com"
                                autoComplete="email"
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
                                placeholder="John Doe"
                                autoComplete="name"
                                inputMode="text"
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
                                type="password"
                                autoComplete="password"
                                inputMode="text"
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
                                type="password"
                                autoComplete="password"
                                inputMode="text"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {error !== null && (
                        <p className="text-[0.8rem] font-medium text-red-600">
                          {error}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {isLoading.email ? (
                        <Loader className={"animate-spin"} />
                      ) : (
                        "Sign Up"
                      )}
                    </Button>
                  </div>
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-background text-muted-foreground relative z-10 px-2">
                      Or continue with
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <SocialSignInButton
                      provider="discord"
                      isLoading={socialLoading.discord}
                      onClick={() => handleSocialSignIn("discord")}
                      disabled={loading}
                    />
                    {providerError && (
                      <p className="text-center text-[0.8rem] font-medium text-red-600">
                        {providerError}
                      </p>
                    )}
                  </div>
                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link
                      href={APP_ROUTES.AUTH.SIGN_IN}
                      className="underline underline-offset-4"
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
