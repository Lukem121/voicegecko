import Link from 'next/link';

import { APP_ROUTES } from '~/utils/app-routes';

export default function TermsAndPrivacyNotice() {
  return (
    <p className="px-8 text-center text-muted-foreground text-sm">
      By continuing, you agree to our{' '}
      <Link
        className="underline underline-offset-4 hover:text-primary"
        href={APP_ROUTES.LEGAL.TERMS}
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        className="underline underline-offset-4 hover:text-primary"
        href={APP_ROUTES.LEGAL.PRIVACY}
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
