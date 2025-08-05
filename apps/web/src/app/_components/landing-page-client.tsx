'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability';
import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-text';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@acme/ui/components/ui/accordion';
import { Button, buttonVariants } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@acme/ui/components/ui/navigation-menu';
import { cn } from '@acme/ui/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import GeckoInvisibleWall from 'public/assets/images/geckos/gecko-invisible-wall.png';
import GeckoLaptopWithMic from 'public/assets/images/geckos/gecko-laptop-w-mic.png';
import GeckoPointingWithStick from 'public/assets/images/geckos/gecko-pointing-with-stick.png';
import GeckoStudentSitting from 'public/assets/images/geckos/gecko-student-sitting.png';
import GeckoWelcomeSign from 'public/assets/images/geckos/gecko-welcome-sign.png';
import GeckoWorker from 'public/assets/images/geckos/gecko-worker.png';
import type { Dispatch, SetStateAction } from 'react';
import React, { useEffect, useState } from 'react';
import { FaWindows } from 'react-icons/fa';
import {
  HiArrowRight,
  HiBookOpen,
  HiBriefcase,
  HiCheck,
  HiChevronDown,
  HiDocumentText,
  HiHeart,
  HiLightningBolt,
  HiMail,
  HiMenu,
  HiMicrophone,
  HiPencilAlt,
  HiPhone,
  HiSparkles,
  HiTrendingUp,
  HiUsers,
  HiX,
} from 'react-icons/hi';
import { TbSparkles } from 'react-icons/tb';
import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';
import type { DownloadsData } from '~/lib/downloads-utils';
import { getPrimaryDownload } from '~/lib/downloads-utils';
import { CurrencySelector, useCurrency } from '~/providers/currency';
import Threads from './landing/threads';

// Simple height measurement hook replacement
const useMeasure = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);

  React.useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  }, []);

  return [ref, { height }] as const;
};

// Rive gecko placeholders
function RiveGeckoPlaceholder({
  pose = 'idle',
  label,
  className,
}: {
  pose?: 'idle' | 'wave' | 'point' | 'run' | 'jump' | 'peek' | 'float';
  label?: string;
  className?: string;
}) {
  // Use static images for some poses to reduce animation workload
  if (pose === 'peek') {
    return (
      <Image
        alt="Gecko peeking"
        className={cn('size-auto', className)}
        src={GeckoInvisibleWall}
      />
    );
  }

  if (pose === 'wave') {
    return (
      <Image
        alt="Gecko waving"
        className={cn('size-auto', className)}
        src={GeckoWelcomeSign}
      />
    );
  }

  if (pose === 'point') {
    return (
      <Image
        alt="Gecko pointing"
        className={cn('size-auto', className)}
        src={GeckoPointingWithStick}
      />
    );
  }

  if (pose === 'float') {
    return (
      <Image
        alt="Gecko running"
        className={cn('size-auto', className)}
        src={GeckoWorker}
      />
    );
  }

  if (pose === 'run') {
    return (
      <Image
        alt="Gecko running"
        className={cn('size-auto', className)}
        src={GeckoLaptopWithMic}
      />
    );
  }

  return (
    <div
      aria-label={label ?? `Gecko pose: ${pose}`}
      className={cn(
        'relative grid place-items-center rounded-xl border border-accent/70 border-dashed bg-accent/50 text-accent-foreground',
        className
      )}
      role="img"
    >
      <div className="-z-10 pointer-events-none absolute inset-0 bg-[radial-gradient(400px_120px_at_50%_10%,hsl(var(--accent)),transparent)] opacity-10" />
      <div className="flex flex-col items-center p-3">
        <div className="font-bold text-[10px] uppercase tracking-wider opacity-70">
          Gecko Placeholder
        </div>
        <div className="mt-1 rounded-full bg-background/70 px-2 py-0.5 font-semibold text-[10px]">
          Pose: {pose}
        </div>
        <div className="mt-2 text-[11px] opacity-70">
          Replace with your Rive file
        </div>
      </div>
    </div>
  );
}

// Client component to handle interactive elements
export default function LandingPageClient({
  downloadsData,
  downloadError,
  prices,
  pricingError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'yearly'
  );
  const {
    isOpen: isStudentModalOpen,
    openModal: openStudentModal,
    closeModal: closeStudentModal,
  } = useStudentDiscountModal();

  // Get selected currency from provider
  const { currency } = useCurrency();

  // Helper to format price with currency
  const formatPrice = (price: PriceWithMetadata) => {
    // Defensive programming: check if price and currencies exist
    if (!price?.currencies) {
      return '$0'; // Fallback for invalid price data
    }

    const currencyData = price.currencies[currency];

    // Check if currency data exists for the selected currency
    if (!currencyData) {
      return '$0'; // Fallback if currency not available
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyData.currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(currencyData.unitAmount / 100); // Convert from cents
  };

  // Helper to format yearly price as monthly equivalent
  const formatYearlyAsMonthly = (price: PriceWithMetadata) => {
    // Defensive programming: check if price and currencies exist
    if (!price?.currencies) {
      return '$0'; // Fallback for invalid price data
    }

    const currencyData = price.currencies[currency];

    // Check if currency data exists for the selected currency
    if (!currencyData) {
      return '$0'; // Fallback if currency not available
    }

    const monthlyAmount = currencyData.unitAmount / 12; // Divide yearly price by 12
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyData.currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(monthlyAmount / 100); // Convert from cents
  };

  // Helper to find the right price for a plan
  const findPriceForPlan = (planId: string, interval: 'monthly' | 'yearly') => {
    if (!prices) {
      return null;
    }

    // Find price that matches the plan name and interval type
    const matchingPriceEntry = Object.entries(prices).find(([_, price]) => {
      return price.planName === planId && price.intervalType === interval;
    });

    return matchingPriceEntry ? matchingPriceEntry[1] : null;
  };

  // Get price display strings with fallbacks
  const getPriceDisplay = (
    planId: string,
    interval: 'monthly' | 'yearly',
    fallback: string
  ) => {
    const price = findPriceForPlan(planId, interval);
    return price ? formatPrice(price) : fallback;
  };

  // Get yearly price display as monthly equivalent
  const getYearlyPriceAsMonthly = (planId: string, fallback: string) => {
    const price = findPriceForPlan(planId, 'yearly');
    return price ? formatYearlyAsMonthly(price) : fallback;
  };

  const isYearly = billingPeriod === 'yearly';

  return (
    <div className="relative">
      <nav className="relative z-50 w-full px-6 py-6 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/">
            <VoiceGeckoLogoText className="w-32" />
          </Link>

          <div>
            {/* Desktop Navigation & CTA */}
            <div className="hidden items-center gap-8 lg:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium text-muted-foreground tracking-tight hover:text-primary">
                      Product
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ProductContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium text-muted-foreground tracking-tight hover:text-primary">
                      Solutions
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <IndividualsContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium text-muted-foreground tracking-tight hover:text-primary">
                      About
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <AboutContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className="h-9 px-4 py-2 font-medium text-muted-foreground tracking-tight hover:text-primary"
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

            {/* Mobile Menu Button */}
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

      {/* Mobile Menu */}
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
      {/* ===== HERO SECTION ===== */}
      {/* dedicate a large gradient canvas to avoid clipping */}
      <section className="relative w-full overflow-hidden pt-32 pb-16 md:pt-20 md:pb-20">
        {/* Sound wave thread background */}
        <div className="-translate-x-1/2 absolute top-40 bottom-0 left-1/2 opacity-50">
          <div className="relative h-full w-screen max-w-2xl md:max-w-4xl lg:max-w-7xl">
            <Threads amplitude={1.4} distance={0} />
          </div>
        </div>
        <div className="container relative z-10 mx-auto max-w-2xl px-4 text-center md:max-w-4xl md:px-6 lg:max-w-7xl">
          <div className="flex items-center justify-center">
            {/* Hero content */}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <h1 className="mx-auto mb-6 text-balance font-hero text-4xl md:text-5xl lg:text-7xl">
                Stop Typing.{' '}
                <span className="text-primary">Start Talking.</span> Perfect
                Transcripts.
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
                Dictate Anywhere 4× Faster Than Typing
              </p>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
                initial={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
              >
                <WindowsDownloadButton
                  downloadError={downloadError}
                  downloadsData={downloadsData}
                  text="Download for Windows"
                />
              </motion.div>

              <motion.div
                animate={{ opacity: 1 }}
                className="mb-4 flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-xs"
                initial={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
              >
                <span>Loved by 5,000+ users</span>
                <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
                <span>10,000+ hours transcribed</span>
              </motion.div>
              <motion.div
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-xs"
                initial={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.7 }}
              >
                <span className="inline-flex items-center gap-1">
                  <FaWindows className="h-3.5 w-3.5" /> Windows available now
                </span>
                <span className="rounded-full bg-accent px-2 py-1 font-semibold text-accent-foreground">
                  Free plan included
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHY VOICE GECKO ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
          Why Voice Gecko?
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm">
          Built for speed and flow: English-only MVP that gets out of your way
          and onto your clipboard.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <WhyCard
            body="Most transcriptions land on your clipboard in 1–2 seconds."
            tag="Speed"
            title="Blazing fast"
          />
          <WhyCard
            body="Skip exports and menus—your text is ready where you need it."
            tag="Flow"
            title="Clipboard‑first"
          />
          <WhyCard
            body="One shortcut, clean output, minimal UI. Get in, get out."
            tag="Simplicity"
            title="Simple by design"
          />
        </div>
      </section>

      {/* ===== USE CASES BY OUTCOME ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
            Get more done by talking first
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm">
            Outcomes across roles—draft faster, document decisions, never lose
            ideas, and respond quickly.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            <OutcomeCard
              bullets={[
                'Blog outlines without the blank page',
                'Ticket descriptions while you think',
                'Emails in minutes, not half an hour',
              ]}
              pose="point"
              title="Draft faster"
            />
            <OutcomeCard
              bullets={[
                'Summarize meetings as they end',
                'Paste action items instantly',
                'Keep momentum with clear next steps',
              ]}
              pose="peek"
              title="Document decisions"
            />
            <OutcomeCard
              bullets={[
                'Capture sparks mid‑flow',
                'Turn thoughts into bullet points',
                'Keep context with zero friction',
              ]}
              pose="float"
              title="Never lose ideas"
            />
            <OutcomeCard
              bullets={[
                'Draft replies on the go',
                'Drop into chat, docs, or tickets',
                'Move work forward faster',
              ]}
              pose="run"
              title="Respond quickly"
            />
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS + SHORTCUT PLAYGROUND ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-start gap-10 md:grid-cols-3">
            <HowItWorksItem
              body="Hit the shortcut and brain‑dump. No rituals, no clutter."
              icon={<HiMicrophone className="h-5 w-5" />}
              title="Just talk"
            />
            <HowItWorksItem
              body="Most clips are transcribed in under two seconds."
              icon={<HiLightningBolt className="h-5 w-5" />}
              title="Fast turnaround"
            />
            <HowItWorksItem
              body="Clean text lands on your clipboard automatically."
              icon={<TbSparkles className="h-5 w-5" />}
              title="Ready to paste"
            />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_.8fr]">
            <motion.div
              className="rounded-2xl border border-border bg-card p-6"
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
                Three steps to your first transcription
              </h3>
              <ol className="mt-3 space-y-3 text-muted-foreground text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
                    1
                  </span>
                  Download and install for Windows.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
                    2
                  </span>
                  Grant microphone permission.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
                    3
                  </span>
                  Press the shortcut and speak—your text is clipboard‑ready.
                </li>
              </ol>
              <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-muted-foreground text-xs">
                Note: MVP focuses on fast, reliable English transcription.
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted p-3">
                  <p className="font-semibold text-[12px] text-muted-foreground">
                    Your Voice
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    "Draft a recap for our sprint review, note blockers, and
                    assign owners."
                  </p>
                </div>
                <div className="rounded-lg border border-accent bg-accent p-3">
                  <p className="font-semibold text-[12px] text-accent-foreground">
                    Clipboard Output
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-[12px] text-accent-foreground">
                    <li>Summary of sprint</li>
                    <li>Blockers highlighted</li>
                    <li>Owners assigned with next steps</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            <ShortcutPlayground />
          </div>
        </div>
      </section>

      {/* ===== SYSTEM UI SNAPSHOT ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
            Lightweight desktop UI
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm">
            Stays out of your way. Access from the system tray, speak, paste,
            and carry on.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <UiTile
              body="One click to open the recorder and see status."
              pose="peek"
              title="Tray icon"
            />
            <UiTile
              body="Press the shortcut—watch the meter, say your piece."
              pose="run"
              title="Listening"
            />
            <UiTile
              body="In a blink, text is cleaned and copied to your clipboard."
              pose="float"
              title="Processing"
            />
          </div>
        </div>
      </section>

      {/* ===== TRUST / STATS + TESTIMONIALS ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-[.9fr_1.1fr] md:items-center">
            {/* Stats block */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
                Trusted by people who move fast
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <StatBlock label="Hours recorded" value="10k+" />
                <StatBlock label="Free words" value="2k/wk" />
                <StatBlock label="Average rating" value="4.9/5" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-muted-foreground text-xs">
                <Avatar initial="SC" />
                <Avatar initial="MR" />
                <Avatar initial="EW" />
                <Avatar initial="DL" />
                <Avatar initial="AK" />
                <span className="rounded-full border border-border bg-muted px-2 py-1 text-muted-foreground">
                  2,000+ users
                </span>
              </div>
            </div>
            {/* Testimonials */}
            <div className="grid gap-6 md:grid-cols-2">
              <TestimonialCard
                author="Marcus Rodriguez"
                avatar="MR"
                company="InnovateAI"
                jobRole="Senior Developer"
                quote="Saved me ~45 minutes a day on documentation. I just talk through changes and paste."
              />
              <TestimonialCard
                author="Sarah Chen"
                avatar="SC"
                company="TechFlow"
                jobRole="Product Manager"
                quote="Brainstorm, outline, draft—all by voice. I move so much faster."
              />
              <TestimonialCard
                author="Emily Watson"
                avatar="EW"
                company="DataSync"
                jobRole="Team Lead"
                quote="Meetings end with clear notes and owners. It keeps us in motion."
              />
              <TestimonialCard
                author="Alex Kim"
                avatar="AK"
                company="SprintOps"
                jobRole="Engineering Manager"
                quote="Prompts, emails, and tickets—talk first, paste, ship."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="relative overflow-hidden py-20" id="pricing">
        {/* Background decoration */}
        <div className="-z-10 pointer-events-none absolute inset-0">
          <div className="-translate-x-1/2 absolute top-[-20%] left-1/2 h-[900px] w-[900px] rounded-full bg-primary/10 opacity-40 blur-3xl" />
          <div className="absolute right-[-10%] bottom-[-15%] h-[700px] w-[700px] rounded-full bg-accent/10 opacity-50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          {/* Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-gradient-to-b from-background/70 to-background/40 px-3 py-1.5 font-medium text-muted-foreground text-xs shadow-sm ring-1 ring-border/60 backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Transparent Pricing
            </span>
            <h2 className="mt-4 font-bold text-3xl text-foreground tracking-tight md:text-4xl">
              Simple, fair pricing
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              Start free with 2,000 words per week. Upgrade for unlimited
              transcription whenever you’re ready.
            </p>
          </div>
          {/* Toggle */}
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Toggle selected={billingPeriod} setSelected={setBillingPeriod} />
            </div>
          </div>
          {/* ===== PRICING CARDS ===== */}
          <div className="mx-auto max-w-3xl">
            {/* Cards */}
            <div className="mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
              {/* Basic */}
              <PriceCard
                cta="Get Started Free"
                ctaLink="/sign-up"
                features={[
                  {
                    text: '2,000 words per week',
                    included: true,
                    subtext: 'Reset every Monday',
                  },
                  {
                    text: 'Lightning fast transcription',
                    included: true,
                    subtext: '1-2 seconds average',
                  },
                  { text: 'Global shortcut access', included: true },
                  { text: 'Add words to dictionary', included: true },
                  { text: 'Privacy mode', included: true },
                  { text: 'Priority support', included: false },
                ]}
                highlight={false}
                name="Basic"
                period="month"
                popular={false}
                price="$0"
                subtitle="Perfect for trying out Voice Gecko"
              />

              {/* Pro */}
              <PriceCard
                cta="Upgrade to Pro"
                ctaLink="/sign-up?plan=pro"
                features={[
                  {
                    text: 'Unlimited transcriptions',
                    included: true,
                    subtext: 'No weekly limits',
                  },
                  {
                    text: 'Priority processing',
                    included: true,
                    subtext: 'Even faster results',
                  },
                  { text: 'Early access to new features', included: true },
                  {
                    text: 'Priority support',
                    included: true,
                    subtext: 'Get help faster',
                  },
                  { text: 'Advanced custom dictionary', included: true },
                ]}
                highlight
                name="Pro"
                originalPrice={
                  isYearly
                    ? getPriceDisplay('voice gecko pro', 'monthly', '$29')
                    : undefined
                }
                period="month"
                popular
                price={
                  isYearly
                    ? getYearlyPriceAsMonthly('voice gecko pro', '$24')
                    : getPriceDisplay('voice gecko pro', 'monthly', '$29')
                }
                subtitle="For power users and professionals"
              />
            </div>
            {/* Student Discount */}
            <div className="mt-12">
              <Card className="relative border-2 border-border/80 border-dashed bg-background p-5 shadow-none">
                <Image
                  alt="Student"
                  className="-translate-y-1/2 -top-3 absolute left-0 h-10 w-auto"
                  src={GeckoStudentSitting}
                />
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="">
                    <p className="font-medium">Student Discount</p>
                    <p className="text-muted-foreground text-sm">
                      Students get 50% off the Pro plan
                    </p>
                  </div>
                  <Button onClick={openStudentModal} variant="outline">
                    Get discount
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          {/* Footer trust + CTA */}
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-5 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <HiCheck className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <HiCheck className="h-4 w-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <HiCheck className="h-4 w-4 text-primary" />
                <span>30-day money back guarantee</span>
              </div>
            </div>

            {pricingError && (
              <p className="mt-6 text-center text-muted-foreground text-xs">
                Unable to load current pricing. Please visit our{' '}
                <Link className="underline" href="/pricing">
                  pricing page
                </Link>{' '}
                for the latest information.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
            FAQs
          </h2>
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <Accordion className="w-full" collapsible type="single">
              <AccordionItem value="platforms">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  Which platforms are supported?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Windows is available now. macOS is on the roadmap and coming
                  next.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="speed">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  How fast is transcription?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Most recordings are transcribed in 1–2 seconds.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="languages">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  Do you support multiple languages or offline mode?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Not yet. The current MVP focuses on fast, reliable English
                  transcription.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="account">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  Do I need an account?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  You can use the free plan right away. An account may be
                  required for paid features.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="audio">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  What happens with my audio?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  We focus on fast clipboard delivery. We won't retain audio
                  beyond what's required for processing. Full details in our
                  Privacy Policy.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="macos">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  When is macOS support coming?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  macOS is next on the roadmap. You'll be able to opt-in for a
                  launch reminder soon.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="auto-type">
                <AccordionTrigger className="font-semibold text-foreground text-sm">
                  Can it auto-type instead of paste?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Yes—Voice Gecko can paste or auto-type depending on your
                  preference.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h3 className="text-balance font-black font-hero text-3xl text-foreground tracking-tight md:text-4xl">
            Say it. See it. Send it.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Download Voice Gecko and speak your work into existence.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <WindowsDownloadButton
              className={cn(
                buttonVariants({ variant: 'default', size: 'xl' }),
                '!border-foreground rounded-lg border-2 bg-primary/80 font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02]'
              )}
              downloadError={downloadError}
              downloadsData={downloadsData}
              text="Download for Windows"
            />
            <Link
              className={cn(
                buttonVariants({ variant: 'default', size: 'xl' }),
                '!border-foreground rounded-lg border-2 bg-transparent font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02] hover:bg-transparent'
              )}
              href="/use-cases"
            >
              Explore Use Cases
            </Link>
          </div>
          <div className="pointer-events-none mx-auto mt-6 w-40">
            <RiveGeckoPlaceholder className="h-24" pose="wave" />
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
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
              <li>
                <Link className="hover:underline" href="/use-cases">
                  Use Cases
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/changelog">
                  Changelog
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/roadmap">
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">Company</h4>
            <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
              <li>
                <Link className="hover:underline" href="/company">
                  Company
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/careers">
                  Careers
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/press">
                  Press Kit
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
              <li>
                <Link className="hover:underline" href="/user-guides">
                  User Guides
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/workflows">
                  Workflows
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/security">
                  Security
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
              <li>
                <Link className="hover:underline" href="/eula">
                  EULA
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="/cookies">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-border border-t">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-muted-foreground text-xs">
            <div className="flex items-center gap-2">
              <VoiceGeckoLogoText className="w-24 opacity-80" />
              <span>© {new Date().getFullYear()} Voice Gecko</span>
            </div>
            <div className="flex w-56 items-center gap-4">
              <CurrencySelector />
            </div>
          </div>
        </div>
      </footer>

      {/* ===== STICKY CTA RIBBON ===== */}
      <StickyCta downloadError={downloadError} downloadsData={downloadsData} />

      {/* ===== STUDENT DISCOUNT MODAL ===== */}
      <StudentDiscountModal
        isOpen={isStudentModalOpen}
        onClose={closeStudentModal}
      />
    </div>
  );
}

/* =========================
   NAV FLYOUT CONTENT
   ========================= */

const MobileMenuLink = ({
  children,
  href,
  FoldContent,
  setMenuOpen,
}: {
  children: React.ReactNode;
  href: string;
  FoldContent?: React.ElementType;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
}) => {
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
            transition={{
              duration: 0.3,
              ease: 'easeOut',
            }}
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
};

const ProductContent = () => {
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
            <HiLightningBolt className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
            <TbSparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
            <HiBookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
};

const IndividualsContent = () => {
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
                <HiUsers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiBookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiBriefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiPencilAlt className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiTrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiDocumentText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
};

const AboutContent = () => {
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
                <HiHeart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiUsers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiMail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                <HiPhone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
};

/* =========================
   PRESENTATIONAL + NEW COMPONENTS
   ========================= */

// Windows Download Button Component
const WindowsDownloadButton = ({
  downloadsData,
  downloadError,
  className = '',
  text = 'Download',
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
  className?: string;
  text?: string;
}) => {
  const handleDownload = () => {
    if (!downloadsData || downloadError) {
      alert(downloadError ?? 'Download currently unavailable');
      return;
    }

    const windowsPlatform = downloadsData.platforms.windows;
    const primaryDownload = getPrimaryDownload(windowsPlatform);

    if (primaryDownload) {
      const link = document.createElement('a');
      link.href = primaryDownload.url;
      link.download = primaryDownload.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      log.info('Download initiated:', primaryDownload.name);
    } else {
      alert('Windows download not available');
    }
  };

  const isAvailable =
    downloadsData &&
    !downloadError &&
    downloadsData.platforms.windows.available;

  return (
    <button
      className={cn(
        isAvailable
          ? cn(
              buttonVariants({ variant: 'default', size: 'xl' }),
              '!border-black dark:!border-none inline-flex items-center gap-2 rounded-lg border-2 bg-primary/80 font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02]'
            )
          : cn(
              buttonVariants({ variant: 'default', size: 'xl' }),
              '!border-gray-600 inline-flex cursor-not-allowed items-center gap-2 rounded-lg border-2 bg-gray-400 font-semibold text-sm tracking-tight'
            ),
        className
      )}
      disabled={!isAvailable}
      onClick={handleDownload}
      type="button"
    >
      <FaWindows className="h-4 w-4" />
      {isAvailable ? text : 'Download Unavailable'}
    </button>
  );
};

const _Check = () => (
  <span className="inline-flex items-center gap-1 text-green-700">
    <HiCheck className="h-4 w-4" /> Yes
  </span>
);

const WhyCard = ({
  title,
  body,
  tag,
}: {
  title: string;
  body: string;
  tag: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-2.5 py-0.5 font-semibold text-[10px] text-accent-foreground">
      {tag}
    </div>
    <h3 className="mt-3 font-semibold text-base text-card-foreground tracking-tight">
      {title}
    </h3>
    <p className="mt-1 text-muted-foreground text-sm">{body}</p>
  </div>
);

const OutcomeCard = ({
  title,
  bullets,
  pose,
}: {
  title: string;
  bullets: string[];
  pose: 'point' | 'peek' | 'float' | 'run';
}) => (
  <div className="group hover:-translate-y-0.5 rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-card-foreground tracking-tight">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10 w-auto" pose={pose} />
    </div>
    <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground text-sm">
      {bullets.map((b, i) => (
        <li key={`${b.slice(0, 20)}-${i}`}>{b}</li>
      ))}
    </ul>
  </div>
);

const HowItWorksItem = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-muted text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-base text-card-foreground tracking-tight">
        {title}
      </h3>
    </div>
    <p className="mt-3 text-muted-foreground text-sm">{body}</p>
  </div>
);

const _LogoPill = ({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-medium text-card-foreground text-xs">
    {icon && <div className="text-muted-foreground">{icon}</div>} {children}
  </div>
);

const UiTile = ({
  title,
  body,
  pose,
}: {
  title: string;
  body: string;
  pose: 'peek' | 'run' | 'float';
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-card-foreground tracking-tight">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10" pose={pose} />
    </div>
    <p className="mt-2 text-muted-foreground text-sm">{body}</p>
    <div className="mt-4 h-24 rounded-lg border border-border bg-muted text-center text-muted-foreground text-xs">
      <div className="grid h-full place-items-center">
        Placeholder: UI state visual
      </div>
    </div>
  </div>
);

const StatBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-lg border border-border bg-muted p-4 text-center">
    <div className="font-black text-primary text-xl">{value}</div>
    <div className="mt-1 text-muted-foreground text-xs">{label}</div>
  </div>
);

const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-bold text-[11px] text-accent-foreground">
    {initial}
  </div>
);

interface FeatureItem {
  text: string;
  subtext?: string;
  included: boolean;
  isHighlight?: boolean;
}

const PriceCard = ({
  name,
  price,
  originalPrice,
  features,
  cta,
  ctaLink = '/pricing',
  highlight,
  subtitle,
  popular,
  period = 'month',
}: {
  name: string;
  price: string;
  originalPrice?: string;
  features: FeatureItem[];
  cta: string;
  ctaLink?: string;
  highlight?: boolean;
  subtitle?: string;
  popular?: boolean;
  period?: string;
}) => (
  <motion.div
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'relative grid h-full w-full grid-rows-[170px_1fr_auto] overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0px_12px_40px_rgba(0,0,0,0.12)] transition-all',
      highlight
        ? 'ring-1 ring-primary/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0px_18px_50px_rgba(0,0,0,0.16)] hover:ring-primary/40'
        : 'ring-1 ring-border/70 hover:shadow-[0px_10px_30px_rgba(0,0,0,0.10)]',
      highlight && 'border-2 border-primary'
    )}
    initial={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.4, delay: highlight ? 0.08 : 0 }}
  >
    {/* Header */}
    <div
      className={cn(
        'flex h-full flex-col space-y-1.5 border-b p-5',
        highlight ? 'border-primary/20 bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg tracking-tight">{name}</h3>
        {popular && (
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 font-semibold text-[11px] text-primary-foreground shadow-sm">
            Most Popular
          </span>
        )}
      </div>

      <div className="flex items-end gap-2 pt-1">
        {originalPrice && (
          <span className="font-medium text-muted-foreground/70 text-sm line-through">
            {originalPrice}/{period}
          </span>
        )}
      </div>

      <div className={cn('flex items-baseline pt-1', originalPrice && 'pt-0')}>
        <span
          className={cn(
            'font-bold text-3xl',
            highlight ? 'text-foreground' : 'text-foreground'
          )}
        >
          {price === '$0' ? 'Free' : price}
        </span>
        {price !== '$0' && (
          <span className="ml-1 font-medium text-muted-foreground text-sm">
            /{period}
          </span>
        )}
        {highlight && originalPrice && (
          <span className="ml-2 inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[11px] text-emerald-600 ring-1 ring-emerald-500/20">
            Save
          </span>
        )}
      </div>

      <p className="pt-1 pb-1.5 font-medium text-[15px] text-muted-foreground">
        {subtitle}
      </p>
    </div>

    {/* Features */}
    <div className="flex h-full flex-col justify-start p-5">
      <ul className="space-y-3.5">
        {features.map((feature, index) => (
          <FeatureListItem key={`${feature.text}-${index}`} {...feature} />
        ))}
      </ul>
    </div>

    {/* CTA */}
    <div className="p-5 pt-0">
      <Link
        className={cn(
          'inline-flex h-11 w-full items-center justify-center rounded-lg px-8 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          highlight
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-foreground hover:bg-muted/80'
        )}
        href={ctaLink}
      >
        {cta}
      </Link>
    </div>

    {/* Glow for highlight */}
    {highlight && (
      <div className="-z-10 pointer-events-none absolute inset-0 blur-2xl">
        <div className="absolute inset-0 rounded-2xl bg-primary/10" />
      </div>
    )}
  </motion.div>
);

const FeatureListItem = ({
  text,
  subtext,
  included,
  isHighlight,
}: FeatureItem) => {
  return (
    <li className="flex items-start gap-3">
      {included ? (
        <HiCheck
          className={cn(
            'mt-0.5 h-4 w-4 flex-shrink-0',
            isHighlight ? 'text-primary' : 'text-emerald-500'
          )}
        />
      ) : (
        <HiX className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
      )}
      <div className="flex-1">
        <p
          className={cn(
            'font-medium text-sm',
            included ? 'text-foreground' : 'text-muted-foreground/60'
          )}
        >
          {text}
        </p>
        {subtext && (
          <p
            className={cn(
              'mt-0.5 text-xs',
              included ? 'text-muted-foreground' : 'text-muted-foreground/60'
            )}
          >
            {subtext}
          </p>
        )}
      </div>
    </li>
  );
};

const TestimonialCard = ({
  quote,
  author,
  jobRole,
  company,
  avatar,
}: {
  quote: string;
  author: string;
  jobRole: string;
  company: string;
  avatar: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <blockquote className="text-muted-foreground text-sm">"{quote}"</blockquote>
    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground text-sm">
        {avatar}
      </div>
      <div>
        <p className="font-semibold text-card-foreground text-sm">{author}</p>
        <p className="text-muted-foreground text-xs">
          {jobRole} at {company}
        </p>
      </div>
    </div>
  </div>
);

// Sticky CTA Ribbon
const StickyCta = ({
  downloadsData,
  downloadError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) => {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const height = document.body.scrollHeight - window.innerHeight;
      setShow(scrolled > height * 0.2);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(96%,56rem)] rounded-2xl border border-border bg-background/90 p-3 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur"
          exit={{ y: 80, opacity: 0 }}
          initial={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <RiveGeckoPlaceholder className="h-10 w-auto" pose="peek" />
              <p className="text-muted-foreground text-sm">
                Turn speech into text in seconds, not minutes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WindowsDownloadButton
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  '!border-black rounded-lg border-2 bg-primary/80 font-semibold text-xs tracking-tight hover:scale-[1.01]'
                )}
                downloadError={downloadError}
                downloadsData={downloadsData}
                text="Download for Windows"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* =========================
   INTERACTIVE: Shortcut Playground
   ========================= */

const ShortcutPlayground = () => {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'done'>('idle');
  const [hint, setHint] = useState<string>('Press ⊞ Win+Shift+G to try it');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isWindowsCombo =
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key.toLowerCase() === 'g' || e.code === 'KeyG');

      if (isWindowsCombo) {
        e.preventDefault();
        setPhase('listening');
        setHint('Listening… speak your thought');
        setTimeout(() => {
          setPhase('done');
          setHint('Transcribed! Copied to clipboard');
        }, 900);
        setTimeout(() => {
          setPhase('idle');
          setHint('Press ⊞ Win+Shift+G to try it');
        }, 2200);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-6"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
        Try the shortcut
      </h3>
      <p className="mt-1 text-muted-foreground text-sm">
        Press{' '}
        <kbd className="rounded border border-border bg-muted px-1 text-card-foreground">
          ⊞
        </kbd>{' '}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-border bg-muted px-1 text-card-foreground">
          Shift
        </kbd>{' '}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-border bg-muted px-1 text-card-foreground">
          G
        </kbd>
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="font-semibold text-[12px] text-muted-foreground">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                (() => {
                  if (phase === 'idle') {
                    return 'bg-border';
                  }
                  if (phase === 'listening') {
                    return 'bg-primary';
                  }
                  return 'bg-primary';
                })()
              )}
            />
            <span className="font-medium text-card-foreground">
              {(() => {
                if (phase === 'idle') {
                  return 'Idle';
                }
                if (phase === 'listening') {
                  return 'Listening';
                }
                return 'Transcribed';
              })()}
            </span>
          </div>
          <div className="mt-3 rounded-md border border-border border-dashed bg-background p-2 text-[12px] text-muted-foreground">
            {hint}
          </div>
        </div>
        <div className="rounded-lg border border-accent bg-accent p-3">
          <p className="font-semibold text-[12px] text-accent-foreground">
            Clipboard Output (demo)
          </p>
          <div className="mt-1 min-h-14 text-[12px] text-accent-foreground">
            {phase === 'idle' && (
              <span className="opacity-60">Your text will appear here…</span>
            )}
            {phase === 'listening' && (
              <span className="opacity-80">"Let's draft sprint notes…"</span>
            )}
            {phase === 'done' && (
              <ul className="list-disc pl-4">
                <li>Summary of sprint</li>
                <li>Blockers highlighted</li>
                <li>Owners assigned with next steps</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-muted-foreground text-xs">
        <HiSparkles className="h-4 w-4 text-primary" />
        <span>This is a playful demo—no mic required.</span>
      </div>
    </motion.div>
  );
};

type BillingPeriod = 'monthly' | 'yearly';

const Toggle = ({
  selected,
  setSelected,
}: {
  selected: BillingPeriod;
  setSelected: Dispatch<SetStateAction<BillingPeriod>>;
}) => {
  const isYearly = selected === 'yearly';
  return (
    <div className="relative flex w-fit items-center rounded-full border p-1.5">
      <button
        className={`relative px-4 py-2 z-${isYearly ? '0' : '1'}`}
        onClick={() => setSelected('yearly')}
        type="button"
      >
        {isYearly && (
          <motion.div
            className="absolute inset-0 rounded-full bg-neutral-900"
            initial={false}
            layoutId="toggleBackground"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <span
          className={`relative block font-medium text-sm ${isYearly ? 'text-white' : 'text-neutral-800'} duration-200`}
        >
          Yearly
          <span className="ml-2 font-semibold text-green-500 text-xs">
            Save 20%
          </span>
        </span>
      </button>
      <button
        className={`relative px-4 py-2 z-${isYearly ? '1' : '0'}`}
        onClick={() => setSelected('monthly')}
        type="button"
      >
        {!isYearly && (
          <motion.div
            className="absolute inset-0 rounded-full bg-neutral-900"
            initial={false}
            layoutId="toggleBackground"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <span
          className={`relative block font-medium text-sm ${isYearly ? 'text-neutral-800' : 'text-white'} duration-200`}
        >
          Monthly
        </span>
      </button>
    </div>
  );
};
