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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@acme/ui/components/ui/tooltip';
import { cn } from '@acme/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SiDiscord, SiGithub } from 'react-icons/si';
import { usePostHog } from '~/hooks/use-posthog';
import { authClient } from '~/lib/auth/client';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { APP_ROUTES } from '~/utils/app-routes';
import Section from '../_components/section';
import DownloadButton from './download-button';
import Logo from './svgs/logo';

type NavLink = {
  href: string;
  label: string;
  onClick: () => void;
  external?: boolean;
  tooltip?: string;
  icon?: 'github' | 'discord';
  /** Fixed width so Login ↔ Account doesn't shift the nav */
  fixedWidth?: boolean;
};

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

  const navigationLinks: NavLink[] = [
    {
      href: APP_ROUTES.MARKETING.PRICING,
      label: 'Pricing',
      tooltip: 'ITS FREE',
      onClick: () =>
        handleNavigationClick('Pricing', APP_ROUTES.MARKETING.PRICING),
    },
    {
      href: APP_ROUTES.SOCIALS.GITHUB,
      label: 'GitHub',
      external: true,
      icon: 'github',
      onClick: () =>
        handleNavigationClick('GitHub', APP_ROUTES.SOCIALS.GITHUB),
    },
    {
      href: APP_ROUTES.SOCIALS.DISCORD,
      label: 'Discord',
      external: true,
      icon: 'discord',
      onClick: () =>
        handleNavigationClick('Discord', APP_ROUTES.SOCIALS.DISCORD),
    },
    {
      href: session.data?.user ? APP_ROUTES.APP.USAGE : '/sign-in',
      label: session.data?.user ? 'Account' : 'Login',
      fixedWidth: true,
      onClick: () =>
        handleNavigationClick(
          session.data?.user ? 'Account' : 'Login',
          session.data?.user ? APP_ROUTES.APP.USAGE : '/sign-in'
        ),
    },
  ];

  const linkClassName =
    'inline-flex items-center gap-1.5 font-medium text-foreground/80 text-sm transition-colors hover:text-foreground';

  const renderLink = (link: NavLink) => {
    const className = cn(
      linkClassName,
      link.fixedWidth && 'w-[4.5rem] justify-center'
    );

    const content = (
      <>
        {link.icon === 'github' ? (
          <SiGithub aria-hidden className="h-3.5 w-3.5" />
        ) : null}
        {link.icon === 'discord' ? (
          <SiDiscord aria-hidden className="h-3.5 w-3.5" />
        ) : null}
        <span>{link.label}</span>
      </>
    );

    if (link.external) {
      return (
        <a
          className={className}
          href={link.href}
          onClick={link.onClick}
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      );
    }

    const inner = (
      <Link className={className} href={link.href} onClick={link.onClick}>
        {content}
      </Link>
    );

    if (!link.tooltip) {
      return inner;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-center" sideOffset={8}>
          {link.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <header className="relative z-20">
      {isHome && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="hidden items-center justify-center bg-brand-blue px-4 py-5 text-white md:flex dark:bg-primary/80"
        >
          <p className="text-center font-medium font-sans text-sm">
            Free &amp; open source · Runs 100% locally on your device — your
            voice and transcripts never leave your computer
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
            <div className="hidden items-center gap-6 md:flex">
              {navigationLinks.map((link, index) => (
                <div className="flex items-center gap-6" key={link.href}>
                  {index > 0 && (
                    <span aria-hidden className="h-5 w-px bg-border" />
                  )}
                  {renderLink(link)}
                </div>
              ))}
            </div>
            <DownloadButton />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="group size-8 md:hidden"
                  id="mobile-menu-toggle"
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
                className="mt-2 mr-4 w-40 p-1 md:hidden"
              >
                <NavigationMenu
                  className="max-w-none *:w-full"
                  viewport={false}
                >
                  <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                    {navigationLinks.map((link) => (
                      <NavigationMenuItem className="w-full" key={link.href}>
                        {link.external ? (
                          <NavigationMenuLink
                            className="flex items-center gap-1.5 py-1.5"
                            href={link.href}
                            onClick={link.onClick}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {link.icon === 'github' ? (
                              <SiGithub aria-hidden className="h-3.5 w-3.5" />
                            ) : null}
                            {link.icon === 'discord' ? (
                              <SiDiscord aria-hidden className="h-3.5 w-3.5" />
                            ) : null}
                            {link.label}
                          </NavigationMenuLink>
                        ) : (
                          <NavigationMenuLink
                            className="py-1.5"
                            href={link.href}
                            onClick={link.onClick}
                          >
                            {link.label}
                            {link.tooltip ? ' (free)' : null}
                          </NavigationMenuLink>
                        )}
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
