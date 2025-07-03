import { APP_ROUTES } from '@/app/utils/app-routes';
import Link from 'next/link';
export default function TermsAndPrivacyNotice() {
  return (
    <p className="px-8 text-center text-muted-foreground text-sm">
      By continuing, you agree to our{' '}
      <Link
        href={APP_ROUTES.LEGAL.TERMS}
        className="underline underline-offset-4 hover:text-primary"
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        href={APP_ROUTES.LEGAL.PRIVACY}
        className="underline underline-offset-4 hover:text-primary"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
