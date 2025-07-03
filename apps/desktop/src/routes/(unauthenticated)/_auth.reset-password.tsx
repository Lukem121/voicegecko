import type { z } from "zod/v4";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { ResetPasswordSchema } from "@acme/auth/schemas";
import { getAuthErrorMessage } from "@acme/auth/utils";
import VoiceGeckoLogo from "@acme/ui/components/logos/voice-gecko";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

import { authClient } from "~/auth/client";
import TermsAndPrivacyNotice from "./-components/terms-and-privacy-notice";

export const Route = createFileRoute("/(unauthenticated)/_auth/reset-password")(
  {
    validateSearch: (search: Record<string, unknown>) => {
      return {
        token: search.token as string | undefined,
      };
    },
    component: ResetPassword,
  },
);

function ResetPassword() {
  const router = useRouter();
  const search = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof ResetPasswordSchema>) => {
    if (!search.token) {
      setError("Reset token is missing. Please check your email link.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: values.password,
        token: search.token,
        fetchOptions: {
          onSuccess: () => {
            setIsSuccess(true);
            // Redirect to sign-in after successful reset
            setTimeout(() => {
              router.navigate({ to: "/sign-in", search: { redirect: null } });
            }, 2000);
          },
          onError: ({ error }) => {
            console.error("reset-password", { error });

            if (error.code) {
              const errorMessage = getAuthErrorMessage(error.code, "en");
              setError(errorMessage);
            } else {
              const errorMessage = error.message ?? "Failed to reset password.";
              setError(errorMessage);
            }
          },
        },
      });

      if (resetError) {
        console.error("reset-password", { error: resetError });

        if (resetError.code) {
          const errorMessage = getAuthErrorMessage(resetError.code, "en");
          setError(errorMessage);
        } else {
          const errorMessage =
            resetError.message ?? "Failed to reset password.";
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error("reset-password", { error: err });
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!search.token) {
    return (
      <main className="container mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col gap-6">
          <Card className="shadow-lg">
            <CardHeader className="space-y-3 text-center">
              <VoiceGeckoLogo
                className="mx-auto h-10"
                aria-label="VoiceGecko Logo"
              />
              <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                This reset link is invalid or has expired. Please request a new
                password reset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/forgot-password" className="block w-full">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="container mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col gap-6">
          <Card className="shadow-lg">
            <CardHeader className="space-y-3 text-center">
              <VoiceGeckoLogo
                className="mx-auto h-10"
                aria-label="VoiceGecko Logo"
              />
              <CardTitle className="text-xl">
                Password Reset Successful!
              </CardTitle>
              <CardDescription>
                Your password has been successfully reset. You can now sign in
                with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex items-center justify-center space-x-2 text-sm">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Redirecting to sign in...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <VoiceGeckoLogo
              className="mx-auto h-10"
              aria-label="VoiceGecko Logo"
            />
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-6">
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              placeholder="Enter your new password"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passwordConfirmation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              placeholder="Confirm your new password"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {error && (
                      <p className="text-[0.8rem] font-medium text-red-600">
                        {error}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader className="animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                  <div className="text-center text-sm">
                    Remember your password?{" "}
                    <Link
                      to="/sign-in"
                      search={{ redirect: null }}
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
