import { useEffect } from "react";
import { signInSocial } from "@daveyplate/better-auth-tauri";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { Button } from "@acme/ui/components/button";

import { authClient } from "~/auth/client";
import { useIsAuthenticated } from "~/hooks/auth";

const SignIn = () => {
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const router = useRouter();
  const search = Route.useSearch();

  useEffect(() => {
    // Redirect authenticated users to the redirect URL or home page
    if (!isLoading && isAuthenticated) {
      console.log("✅ User already authenticated, redirecting");
      const redirectTo = search.redirect || "/";
      // Use router.history.push for full URL redirects as recommended by TanStack Router docs
      if (search.redirect) {
        router.history.push(search.redirect);
      } else {
        router.navigate({ to: "/" });
      }
    }
  }, [isAuthenticated, isLoading, router, search.redirect]);

  const handleSignIn = async () => {
    try {
      await signInSocial({
        authClient,
        provider: "discord",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Don't render sign-in form if user is already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="container h-screen">
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome</h1>
            <p className="mt-2 text-gray-600">Sign in to access your account</p>
          </div>

          <div className="space-y-4">
            <Button onClick={handleSignIn} className="w-full" size="lg">
              Sign in with Discord
            </Button>
            <p className="text-center text-sm text-gray-500">
              By signing in, you agree to our terms of service and privacy
              policy.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/auth/sign-in")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || "",
    };
  },
  component: SignIn,
});
