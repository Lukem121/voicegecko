'use client';

import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-full';
// import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-text';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@acme/ui/components/ui/navigation-menu';
import { cn } from '@acme/ui/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import { HiArrowRight, HiChevronDown, HiMenu, HiX } from 'react-icons/hi';
import type { DownloadsData } from '~/lib/downloads-utils';
import { APP_ROUTES } from '~/utils/app-routes';
import WindowsDownloadButton from '../components/windows-download-button';

export default function Navigation({
  downloadsData,
  downloadError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 top-0 z-50 w-full bg-transparent backdrop-blur-sm transition-colors'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-12">
          <Link href="/">
            <VoiceGeckoLogoText className="h-10" />
          </Link>
          <div>
            <div className="hidden items-center gap-8 lg:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                      href={APP_ROUTES.APP.USAGE}
                    >
                      Account
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                      href="/pricing"
                    >
                      Pricing
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <WindowsDownloadButton
                downloadError={downloadError}
                downloadsData={downloadsData}
              />
            </div>
            <div className="block lg:hidden">
              <button
                className="block text-3xl"
                onClick={() => setMobileMenuOpen(true)}
                type="button"
              >
                <HiMenu />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            animate={{ x: 0 }}
            className="fixed top-0 left-0 z-50 flex h-screen w-full flex-col bg-background"
            exit={{ x: '100vw' }}
            initial={{ x: '100vw' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between p-6">
              <Link className="flex items-center" href="/">
                <VoiceGeckoLogoText className="w-32" />
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} type="button">
                <HiX className="text-3xl text-foreground" />
              </button>
            </div>
            <div className="h-screen overflow-y-scroll p-6">
              <MobileMenuLink
                href={APP_ROUTES.APP.USAGE}
                setMenuOpen={setMobileMenuOpen}
              >
                Account
              </MobileMenuLink>
              <MobileMenuLink href="/pricing" setMenuOpen={setMobileMenuOpen}>
                Pricing
              </MobileMenuLink>
            </div>
            <div className="p-6">
              <div className="w-full">
                <WindowsDownloadButton
                  className="w-full rounded-lg bg-primary px-5 py-2.5 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  downloadError={downloadError}
                  downloadsData={downloadsData}
                />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileMenuLink({
  children,
  href,
  FoldContent,
  setMenuOpen,
}: {
  children: React.ReactNode;
  href: string;
  FoldContent?: React.ElementType;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative text-foreground">
      {FoldContent ? (
        <button
          className="flex w-full cursor-pointer items-center justify-between border-border border-b py-6 text-start font-semibold text-2xl"
          onClick={() => setOpen((pv) => !pv)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen((pv) => !pv);
            }
          }}
          tabIndex={0}
          type="button"
        >
          <Link
            href={href}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }}
          >
            {children}
          </Link>
          <motion.div
            animate={{ rotate: open ? '180deg' : '0deg' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <HiChevronDown />
          </motion.div>
        </button>
      ) : (
        <Link
          className="flex w-full cursor-pointer items-center justify-between border-border border-b py-6 text-start font-semibold text-2xl"
          href={href}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
        >
          <span>{children}</span>
          <HiArrowRight />
        </Link>
      )}
      {FoldContent && (
        <motion.div
          animate={{
            height: open ? 'auto' : '0px',
            marginBottom: open ? '24px' : '0px',
            marginTop: open ? '12px' : '0px',
          }}
          className="overflow-hidden"
          initial={false}
        >
          <div>
            <FoldContent />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Removed dropdown content components to keep header minimal during launch
