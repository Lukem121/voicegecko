import Link from "next/link";

import { getAuthErrorMessage } from "@acme/auth/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

import { APP_ROUTES } from "~/utils/app-routes";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const errorCode = (await searchParams).error as string;
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
            href={APP_ROUTES.AUTH.SIGN_IN}
            className="focus:ring-primary mt-4 text-sm hover:underline focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
