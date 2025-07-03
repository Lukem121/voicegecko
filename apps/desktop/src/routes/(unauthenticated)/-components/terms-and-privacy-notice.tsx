import { Link } from "@tanstack/react-router";

export default function TermsAndPrivacyNotice() {
  return (
    <p className="text-muted-foreground px-8 text-center text-sm">
      By continuing, you agree to our{" "}
      <Link
        to="/legal/terms"
        className="hover:text-primary underline underline-offset-4"
      >
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link
        to="/legal/privacy"
        className="hover:text-primary underline underline-offset-4"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
