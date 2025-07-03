import type { z } from "zod/v4";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { ForgotPasswordSchema } from "@acme/auth/schemas";
import { getAuthErrorMessage } from "@acme/auth/utils";
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

export const Route = createFileRoute("/(unauthenticated)/_auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof ForgotPasswordSchema>) => {
    setIsLoading(true);

    const { error } = await authClient.forgetPassword({
      email: values.email,
      redirectTo: "/reset-password",
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
