import Link from "next/link";

import VoiceGeckoLogo from "@acme/ui/components/logos/logo-full";

export default function LandingPage() {
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <VoiceGeckoLogo className="w-46" />

        <Link href="/app">Get Started</Link>
      </div>
    </main>
  );
}
