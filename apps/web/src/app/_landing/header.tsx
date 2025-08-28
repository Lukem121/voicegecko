'use client';
import { Button } from '@acme/ui/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@acme/ui/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@acme/ui/components/ui/popover';
import { cn } from '@acme/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePostHog } from '~/hooks/use-posthog';
import { authClient } from '~/lib/auth/client';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { APP_ROUTES } from '~/utils/app-routes';
import Section from '../_components/section';
import DownloadButton from './download-button';
import Logo from './svgs/logo';

export default function Header() {
  const session = authClient.useSession();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { trackEvent } = usePostHog();

  const handleNavigationClick = (linkText: string, linkUrl: string) => {
    trackEvent({
      event: 'navigation_click',
      link_text: linkText,
      link_url: linkUrl,
      location: 'header',
      source: POSTHOG_SOURCES.HEADER,
      timestamp: new Date().toISOString(),
    });
  };

  // Navigation links array for both desktop and mobile menus
  const navigationLinks = [
    {
      href: '/pricing',
      label: 'Pricing',
      onClick: () => handleNavigationClick('Pricing', '/pricing'),
    },
    {
      href: session.data?.user ? APP_ROUTES.APP.USAGE : '/sign-in',
      label: session.data?.user ? 'Account' : 'Login',
      onClick: () =>
        handleNavigationClick(
          session.data?.user ? 'Account' : 'Login',
          session.data?.user ? APP_ROUTES.APP.USAGE : '/sign-in'
        ),
    },
  ];
  return (
    <header className="relative z-20">
      {isHome && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="hidden items-center justify-center bg-brand-blue px-4 py-5 text-white md:flex dark:bg-primary/80"
        >
          <p className="text-center font-medium font-sans text-sm">
            Get more done in less time — Voice to Text can 4x your productivity
            by turning your voice into instant, accurate text.
          </p>
        </div>
      )}
      <nav aria-label="Main" className="backdrop-blur-sm">
        <Section
          className={cn(
            'flex h-16 items-center justify-between bg-transparent px-4 py-4 md:py-4',
            isHome && 'max-w-[90rem]'
          )}
        >
          <Link href="/">
            <Logo className="h-8" />
          </Link>
          <div className="flex items-center gap-2 md:gap-6">
            {/* Desktop navigation links - hidden on mobile */}
            <div className="hidden items-center gap-6 md:flex">
              {navigationLinks.map((link, index) => (
                <div className="flex items-center gap-6" key={link.href}>
                  {index > 0 && (
                    <span aria-hidden className="h-5 w-px bg-border" />
                  )}
                  <Link
                    className="font-medium text-foreground/80 text-sm transition-colors hover:text-foreground"
                    href={link.href}
                    onClick={link.onClick}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </div>
            <DownloadButton />
            {/* Mobile burger menu - shown only on mobile */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="mobile-menu-toggle"
                  className="group size-8 md:hidden"
                  size="icon"
                  variant="ghost"
                >
                  <svg
                    className="pointer-events-none"
                    fill="none"
                    height={16}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width={16}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Toggle mobile menu</title>
                    <path
                      className="-translate-y-[7px] origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                      d="M4 12L20 12"
                    />
                    <path
                      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                      d="M4 12H20"
                    />
                    <path
                      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                      d="M4 12H20"
                    />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="mt-2 mr-4 w-36 p-1 md:hidden"
              >
                <NavigationMenu
                  className="max-w-none *:w-full"
                  viewport={false}
                >
                  <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                    {navigationLinks.map((link) => (
                      <NavigationMenuItem className="w-full" key={link.href}>
                        <NavigationMenuLink
                          className="py-1.5"
                          href={link.href}
                          onClick={link.onClick}
                        >
                          {link.label}
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </PopoverContent>
            </Popover>
          </div>
        </Section>
      </nav>
    </header>
  );
}
