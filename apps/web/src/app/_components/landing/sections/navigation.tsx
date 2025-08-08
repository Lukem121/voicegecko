'use client';

import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-full';
// import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-text';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@acme/ui/components/ui/navigation-menu';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import React, { useState } from 'react';
import {
  HiAdjustments,
  HiArrowRight,
  HiBookOpen,
  HiBriefcase,
  HiChevronDown,
  HiDocumentText,
  HiHeart,
  HiLightningBolt,
  HiMail,
  HiMenu,
  HiPencil,
  HiPhone,
  HiTrendingUp,
  HiUsers,
  HiX,
} from 'react-icons/hi';
import type { DownloadsData } from '~/lib/downloads-utils';
import WindowsDownloadButton from '../components/windows-download-button';

function useMeasure() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);
  React.useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  }, []);
  return [ref, { height }] as const;
}

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
      <nav className="relative z-50 w-full px-4 py-4 md:px-6 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/">
            <VoiceGeckoLogoText className="h-10" />
          </Link>
          <div>
            <div className="hidden items-center gap-8 lg:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ProductContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <IndividualsContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>About</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <AboutContent />
                    </NavigationMenuContent>
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
                FoldContent={ProductContent}
                href="/product"
                setMenuOpen={setMobileMenuOpen}
              >
                Product
              </MobileMenuLink>
              <MobileMenuLink
                FoldContent={IndividualsContent}
                href="/solutions"
                setMenuOpen={setMobileMenuOpen}
              >
                Solutions
              </MobileMenuLink>
              <MobileMenuLink href="/pricing" setMenuOpen={setMobileMenuOpen}>
                Pricing
              </MobileMenuLink>
              <MobileMenuLink
                FoldContent={AboutContent}
                href="/about"
                setMenuOpen={setMobileMenuOpen}
              >
                About
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
  const [ref, { height }] = useMeasure();
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
            height: open ? height : '0px',
            marginBottom: open ? '24px' : '0px',
            marginTop: open ? '12px' : '0px',
          }}
          className="overflow-hidden"
          initial={false}
        >
          <div ref={ref}>
            <FoldContent />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ProductContent() {
  return (
    <div className="w-56 p-2">
      <h2 className="mb-1 font-semibold text-muted-foreground/60 text-xs">
        Getting Started
      </h2>
      <div className="-mx-2 space-y-1">
        <Link
          className="block rounded-lg p-2 transition-colors hover:bg-muted"
          href="/use-cases"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
              <HiLightningBolt className="h-4 w-4" />
            </span>
            <div>
              <h3 className="mb-0.5 font-medium text-foreground text-sm">
                Use Cases
              </h3>
              <p className="text-muted-foreground text-xs">
                Speak first, type less, do more
              </p>
            </div>
          </div>
        </Link>
        <Link
          className="block rounded-lg p-2 transition-colors hover:bg-muted"
          href="/workflows"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
              <HiAdjustments className="h-4 w-4" />
            </span>
            <div>
              <h3 className="mb-0.5 font-medium text-foreground text-sm">
                Workflows
              </h3>
              <p className="text-muted-foreground text-xs">
                Build voice-first habits
              </p>
            </div>
          </div>
        </Link>
        <Link
          className="block rounded-lg p-2 transition-colors hover:bg-muted"
          href="/user-guides"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
              <HiBookOpen className="h-4 w-4" />
            </span>
            <div>
              <h3 className="mb-0.5 font-medium text-foreground text-sm">
                User Guides
              </h3>
              <p className="text-muted-foreground text-xs">
                Tips to get the most out of Voice Gecko
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function IndividualsContent() {
  return (
    <div className="w-80 p-2 sm:w-[480px]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:divide-x sm:divide-neutral-200">
        <div className="space-y-2 sm:pr-3">
          <h3 className="mb-1 font-semibold text-muted-foreground/60 text-xs">
            Voice Gecko for
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-muted"
              href="/leaders"
            >
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiUsers className="h-4 w-4" />
                </span>
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Leaders
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Unblock teams, move work forward
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-muted"
              href="/students"
            >
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiBookOpen className="h-4 w-4" />
                </span>
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Students
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Capture lectures, draft essays faster
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-muted"
              href="/professionals"
            >
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiBriefcase className="h-4 w-4" />
                </span>
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Professionals
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Draft emails, notes, and updates on the fly
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-muted"
              href="/creators"
            >
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiPencil className="h-4 w-4" />
                </span>
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Creators
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Capture ideas and outlines anywhere
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="space-y-2 sm:pl-3">
          <h3 className="mb-1 font-semibold text-muted-foreground/60 text-xs">
            Popular flows
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-muted"
              href="/case-studies/meeting-notes"
            >
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiTrendingUp className="h-4 w-4" />
                </span>
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Meeting Recaps
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Speak decisions and next steps, then paste
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-muted"
              href="/case-studies/quick-drafts"
            >
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiDocumentText className="h-4 w-4" />
                </span>
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Quick Drafts
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Talk your emails, docs, or tickets into shape
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="w-56 p-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="mb-1 font-semibold text-muted-foreground/60 text-xs">
            Learn about Voice Gecko
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              className="block rounded-lg p-2 transition-colors hover:bg-muted"
              href="/company"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiHeart className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Company
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Our mission and the Gecko behind it
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block rounded-lg p-2 transition-colors hover:bg-muted"
              href="/careers"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiUsers className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Careers
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Help shape voice-first computing
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="mb-1 font-semibold text-muted-foreground/60 text-xs">
            Get Help
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              className="block rounded-lg p-2 transition-colors hover:bg-muted"
              href="/support"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiMail className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Support
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    We're here if you need a hand
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block rounded-lg p-2 transition-colors hover:bg-muted"
              href="/sales"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground">
                  <HiPhone className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="mb-0.5 font-medium text-foreground text-sm">
                    Sales
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Teams interested in volume or invoicing
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
