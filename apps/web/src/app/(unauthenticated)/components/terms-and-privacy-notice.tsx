import Link from "next/link";

import { APP_ROUTES } from "~/utils/app-routes";

export default function TermsAndPrivacyNotice() {
  return (
    <p className="text-muted-foreground px-8 text-center text-sm">
      By continuing, you agree to our{" "}
      <Link
        href={APP_ROUTES.LEGAL.TERMS}
        className="hover:text-primary underline underline-offset-4"
      >
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link
        href={APP_ROUTES.LEGAL.PRIVACY}
        className="hover:text-primary underline underline-offset-4"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
