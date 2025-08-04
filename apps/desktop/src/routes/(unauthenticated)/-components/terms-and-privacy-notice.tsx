import { Link } from '@tanstack/react-router';

export default function TermsAndPrivacyNotice() {
  return (
    <p className="px-8 text-center text-muted-foreground text-sm">
      By continuing, you agree to our{' '}
      <Link
        className="underline underline-offset-4 hover:text-primary"
        to="/legal/terms"
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        className="underline underline-offset-4 hover:text-primary"
        to="/legal/privacy"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
