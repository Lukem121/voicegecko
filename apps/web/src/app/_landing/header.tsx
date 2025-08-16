'use client';

import { cn } from '@acme/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TfiMenu } from 'react-icons/tfi';
import { authClient } from '~/lib/auth/client';
import { APP_ROUTES } from '~/utils/app-routes';
import Section from '../_components/landing/components/section';
import DownloadButton from './download-button';
import Logo from './svgs/logo';

export default function Header() {
  const session = authClient.useSession();
  const pathname = usePathname();
  const isHome = pathname === '/';
  return (
    <header>
      {isHome && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="hidden items-center justify-center bg-accent px-4 py-5 text-white md:flex dark:bg-primary/80"
        >
          <p className="text-center font-medium font-sans text-sm">
            Get more done in less time — Voice to Text can 4x your productivity
            by turning your voice into instant, accurate text.
          </p>
        </div>
      )}
      <nav aria-label="Main">
        <Section
          className={cn(
            'flex items-center justify-between px-4 py-4 md:py-4',
            isHome && 'max-w-[90rem]'
          )}
        >
          <Link href="/">
            <Logo className="h-8" />
          </Link>
          <div className="flex items-center gap-4 md:gap-6">
            {/* Desktop navigation links - hidden on mobile */}
            <div className="hidden items-center gap-6 md:flex">
              <Link
                className="font-medium text-foreground/80 text-sm transition-colors hover:text-foreground"
                href="/pricing"
              >
                Pricing
              </Link>
              <span aria-hidden className="h-5 w-px bg-border" />
              {session.data?.user ? (
                <Link
                  className="font-medium text-foreground/80 text-sm transition-colors hover:text-foreground"
                  href={APP_ROUTES.APP.USAGE}
                >
                  Account
                </Link>
              ) : (
                <Link
                  className="font-medium text-foreground/80 text-sm transition-colors hover:text-foreground"
                  href="/sign-in"
                >
                  Login
                </Link>
              )}
            </div>
            <DownloadButton />
            {/* Mobile burger menu - shown only on mobile */}
            <TfiMenu className="h-5 w-5 md:hidden" />
          </div>
        </Section>
      </nav>
    </header>
  );
}
