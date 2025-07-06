"use client";

import type { z } from "zod/v4";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";

import { ResetPasswordSchema } from "@acme/auth/schemas";
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
import { toast } from "@acme/ui/components/ui/sonner";

import { authClient } from "~/lib/client";
import { APP_ROUTES } from "~/utils/app-routes";

type FormValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    if (!token) {
      setError(getAuthErrorMessage("INVALID_TOKEN", "en"));
      return;
    }

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token,
      fetchOptions: {
        onSuccess: () => {
          router.push(APP_ROUTES.AUTH.SIGN_IN);
          toast.success("Password reset successful, please sign in.");
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
    }

    setIsLoading(false);
  };

  return (
    <div className={"flex flex-col gap-6"}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            Enter your new password and confirm your password.
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
                              disabled={isLoading || isSuccess}
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
                              disabled={isLoading || isSuccess}
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
