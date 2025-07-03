import { createFileRoute, Link } from "@tanstack/react-router";

import { getAuthErrorMessage } from "@acme/auth/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

export const Route = createFileRoute("/(unauthenticated)/_auth/authentication-error")(
  {
    validateSearch: (search: Record<string, unknown>) => {
      return {
        error: search.error as string,
      };
    },
    component: AuthErrorPage,
  },
);

function AuthErrorPage() {
  const search = Route.useSearch();
  const errorCode = search.error as string;
  const errorMessage = getAuthErrorMessage(errorCode, "en");

  return (
    <main className="flex flex-col gap-6 px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p
            className="text-center text-sm text-balance text-red-600"
            role="alert"
            aria-live="assertive"
          >
            {errorMessage}
          </p>

          <Link
            to="/sign-in"
            search={{ redirect: null }}
            className="focus:ring-primary mt-4 text-sm hover:underline focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
