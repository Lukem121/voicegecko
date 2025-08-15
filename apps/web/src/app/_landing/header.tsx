import { TfiMenu } from 'react-icons/tfi';
import DownloadButton from './download-button';
import Logo from './svgs/logo';

export default function Header() {
  return (
    <header>
      <div
        aria-atomic="true"
        aria-live="polite"
        className="hidden items-center justify-center bg-accent px-4 py-5 text-white md:flex"
      >
        <p className="text-center font-medium font-sans text-sm">
          Get more done in less time — Voice to Text can 4x your productivity by
          turning your voice into instant, accurate text.
        </p>
      </div>

      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[90rem] items-center justify-between px-4 py-4 md:px-6 lg:px-12"
      >
        <Logo className="h-8" />
        <div className="flex items-center gap-4 md:gap-6">
          {/* Desktop navigation links - hidden on mobile */}
          <div className="hidden items-center gap-6 md:flex">
            <a
              className="font-medium text-foreground/80 text-sm transition-colors hover:text-foreground"
              href="/pricing"
            >
              Pricing
            </a>
            <span aria-hidden className="h-5 w-px bg-border" />
            <a
              className="font-medium text-foreground/80 text-sm transition-colors hover:text-foreground"
              href="/auth/login"
            >
              Login
            </a>
          </div>
          <DownloadButton />
          {/* Mobile burger menu - shown only on mobile */}
          <TfiMenu className="h-5 w-5 md:hidden" />
        </div>
      </nav>
    </header>
  );
}
