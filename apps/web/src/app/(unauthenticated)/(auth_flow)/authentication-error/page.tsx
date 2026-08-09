import { getAuthErrorMessage } from '@acme/auth/utils/auth-error-messages';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import Link from 'next/link';

import { APP_ROUTES } from '~/utils/app-routes';

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const errorCode = (await searchParams).error as string;
  const errorMessage = getAuthErrorMessage(errorCode, 'en');

  return (
    <main className="flex flex-col gap-6 px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p
            aria-live="assertive"
            className="text-balance text-center text-red-600 text-sm"
            role="alert"
          >
            {errorMessage}
          </p>

          <Link
            className="mt-4 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            href={APP_ROUTES.AUTH.SIGN_IN}
          >
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
