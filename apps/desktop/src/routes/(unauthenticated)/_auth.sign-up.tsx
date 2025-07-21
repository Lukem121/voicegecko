import type { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader } from "lucide-react";

import { SignUpSchema } from "@acme/auth/schemas";
import LogoFull from "@acme/ui/components/logos/logo-full";
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

import { SocialSignInButton } from "./-components/social-sign-in-button";
import TermsAndPrivacyNotice from "./-components/terms-and-privacy-notice";
import { useEmailSignup } from "./-hooks/use-email-signup";
import { useSocialAuth } from "./-hooks/use-social-auth";

export const Route = createFileRoute("/(unauthenticated)/_auth/sign-up")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string | undefined) ?? null,
    };
  },
  component: SignUp,
});

const isEmailError = (error: string) => {
  return (
    error.toLowerCase().includes("email") ||
    error.toLowerCase().includes("user_already_exists")
  );
};

const isUsernameError = (error: string) => {
  return error.toLowerCase().includes("username");
};

function SignUp() {
  const router = useRouter();
  const search = Route.useSearch();
  const callbackURL = search.redirect ?? "/";

  const {
    signIn: handleSocialSignIn,
    isLoading: socialLoading,
    error: socialError,
    loading: isSocialLoading,
  } = useSocialAuth(); // Remove callbackURL - let Tauri plugin handle deep links

  const {
    signUp: handleEmailSignup,
    isLoading: emailLoading,
    error: emailError,
  } = useEmailSignup({
    callbackURL,
  });

  const loading = emailLoading || isSocialLoading;
  const error = emailError || socialError;

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
    const { success } = await handleEmailSignup(values);

    if (success) {
      void router.navigate({
        to: "/verify-email",
        search: { email: values.email, redirect: callbackURL },
      });
    } else {
      // Handle field-specific errors
      if (emailError) {
        if (isUsernameError(emailError)) {
          form.setError("username", {
            message: emailError,
          });
        } else if (isEmailError(emailError)) {
          form.setError("email", {
            message: emailError,
          });
        }
      }
    }
  };

  return (
    <>
      <div className={"flex flex-col gap-4"}>
        <Card>
          <CardHeader className="items-start">
            <LogoFull className="h-10" />
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
                      {error &&
                        !form.formState.errors.email &&
                        !form.formState.errors.username && (
                          <p className="text-[0.8rem] font-medium text-red-600">
                            {error}
                          </p>
                        )}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {emailLoading ? (
                        <Loader className={"animate-spin"} />
                      ) : (
                        "Sign Up"
                      )}
                    </Button>
                  </div>
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-card text-muted-foreground relative z-10 px-2">
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
                    {socialError && (
                      <p className="text-center text-[0.8rem] font-medium text-red-600">
                        {socialError}
                      </p>
                    )}
                  </div>
                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link
                      to="/sign-in"
                      search={{ redirect: callbackURL }}
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
