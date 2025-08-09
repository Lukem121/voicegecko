'use client';

import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-text';
import { ThemeToggle } from '@acme/ui/components/ui/theme';
import Link from 'next/link';
import { CurrencySelector } from '~/providers/currency';

export default function FooterSection() {
  return (
    <footer className="mb-24 border-border border-t bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <h4 className="font-semibold text-foreground text-sm">Product</h4>
          <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
            <li>
              <Link className="hover:underline" href="/pricing">
                Pricing
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm">Company</h4>
          <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
            <li>
              <Link className="hover:underline" href="/careers">
                Careers
              </Link>
            </li>

            <li>
              <Link className="hover:underline" href="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm">Resources</h4>
          <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
            <li>
              <Link className="hover:underline" href="/support">
                Support
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm">Legal</h4>
          <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
            <li>
              <Link className="hover:underline" href="/privacy">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/terms">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-border border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-6 text-muted-foreground text-xs md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <VoiceGeckoLogoText className="w-24 opacity-80" />
            <span>© {new Date().getFullYear()} Voice Gecko</span>
          </div>
          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="flex w-full items-center gap-4 md:w-56">
              <CurrencySelector />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
