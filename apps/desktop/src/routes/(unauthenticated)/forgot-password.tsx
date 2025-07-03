"use client";

import type { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@repo/auth/client";
import { ForgotPasswordSchema } from "@repo/auth/schemas/auth.schema";
import { getAuthErrorMessage } from "@repo/auth/utils/auth-error-messages";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@repo/design-system/components/ui/form";
import { Input } from "@repo/design-system/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { APP_ROUTES } from "../../utils/app-routes";
import TermsAndPrivacyNotice from "./components/terms-and-privacy-notice";

export const Route = createFileRoute("/(unauthenticated)/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string | undefined) ?? null,
    };
  },
  component: ForgotPassword,
});

function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const form = useForm({
    schema: ForgotPasswordSchema,
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof ForgotPasswordSchema>) => {
    setIsLoading(true);

    const { error } = await authClient.forgetPassword({
      email: values.email,
      redirectTo: APP_ROUTES.AUTH.RESET_PASSWORD,
      fetchOptions: {
        onSuccess: () => {
          setIsSuccess(true);
        },
      },
    });

    if (error) {
      const { code, message } = error;

      if (code) {
        const errorMessage = getAuthErrorMessage(code, "en", message);
        setError(errorMessage);
      }

      setIsSuccess(false);
    }

    setIsLoading(false);
  };

  return (
    <>
      <div className={"flex flex-col gap-6"}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we will send you a link to reset your
              password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-6">
                  <div className="grid gap-6">
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
                                disabled={isLoading || isSuccess}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isSuccess && (
                        <p className="text-[0.8rem] font-medium text-green-600">
                          If an account exists, we have sent you an email to
                          reset your password.
                        </p>
                      )}
                      {error !== null && (
                        <p className="text-[0.8rem] font-medium text-red-600">
                          {error}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || isSuccess}
                    >
                      {isLoading ? (
                        <Loader className={"animate-spin"} />
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
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
