import { createFileRoute } from "@tanstack/react-router";

import VoiceGeckoLogo from "@acme/ui/components/logos/voice-gecko";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@acme/ui/components/ui/card";

import { getClientAuthErrorMessage } from "~/utils/client-error-messages";

export const Route = createFileRoute(
  "/(unauthenticated)/_auth/authentication-error",
)({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      error: (search.error as string | undefined) ?? null,
    };
  },
  component: AuthenticationError,
});

function AuthenticationError() {
  const search = Route.useSearch();
  const error = search.error;

  const message = error
    ? getClientAuthErrorMessage(error, "en")
    : "An authentication error occurred.";

  return (
    <main className="container mx-auto max-w-md px-4 py-8">
      <Card className="shadow-lg">
        <CardHeader className="space-y-3">
          <VoiceGeckoLogo
            className="mx-auto h-10"
            aria-label="VoiceGecko Logo"
          />
          <CardDescription className="text-center">
            Authentication Error
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-red-500">{message}</p>
          </div>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
