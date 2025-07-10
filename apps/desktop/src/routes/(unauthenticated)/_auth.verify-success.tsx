import { useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";

import LogoFull from "@acme/ui/components/logos/logo-full";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

import { authClient } from "~/lib/client";

export const Route = createFileRoute("/(unauthenticated)/_auth/verify-success")(
  {
    validateSearch: (search: Record<string, unknown>) => {
      return {
        redirect: (search.redirect as string | undefined) ?? "/",
      };
    },
    component: VerifySuccess,
  },
);

function VerifySuccess() {
  const router = useRouter();
  const search = Route.useSearch();
  const { refetch } = authClient.useSession();

  useEffect(() => {
    // Refetch the session to ensure we have the latest authentication state
    refetch();

    // Small delay to ensure session is updated before redirecting
    const timer = setTimeout(() => {
      router.navigate({ to: search.redirect });
    }, 2000);

    return () => clearTimeout(timer);
  }, [refetch, router, search.redirect]);

  const handleContinue = () => {
    router.navigate({ to: search.redirect });
  };

  return (
    <main className="container mx-auto max-w-md px-4 py-8">
      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <LogoFull className="mx-auto h-10" aria-label="VoiceGecko Logo" />
            <div className="flex items-center justify-center">
              <CheckCircle2 className="mr-2 h-6 w-6 text-green-500" />
              <CardTitle className="text-xl">Email Verified!</CardTitle>
            </div>
            <CardDescription>
              Your email has been successfully verified. You are now signed in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground flex items-center justify-center space-x-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting you to the app...</span>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full"
              variant="outline"
            >
              Continue to App
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
