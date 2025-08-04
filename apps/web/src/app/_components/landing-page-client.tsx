'use client';

import { log } from '@acme/observability';
import VoiceGeckoLogoText from '@acme/ui/components/logos/logo-text';
import { buttonVariants } from '@acme/ui/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@acme/ui/components/ui/navigation-menu';

import { cn } from '@acme/ui/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import GeckoInvisibleWall from 'public/assets/images/geckos/gecko-invisible-wall.png';
import GeckoPointingWithStick from 'public/assets/images/geckos/gecko-pointing-with-stick.png';
import GeckoWelcomeSign from 'public/assets/images/geckos/gecko-welcome-sign.png';
import GeckoWorker from 'public/assets/images/geckos/gecko-worker.png';
import type { Dispatch, SetStateAction } from 'react';
import React, { useEffect, useState } from 'react';
import Marquee from 'react-fast-marquee';
import { FaWindows } from 'react-icons/fa';
import {
  HiArrowRight,
  HiBookOpen,
  HiBriefcase,
  HiCheck,
  HiChevronDown,
  HiCode,
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
import {
  SiGmail,
  SiGoogledocs,
  SiJira,
  SiLinear,
  SiNotion,
  SiObsidian,
  SiSlack,
  SiTrello,
} from 'react-icons/si';
import { TbSparkles } from 'react-icons/tb';

import type { DownloadsData } from '~/lib/downloads-utils';
import { getPrimaryDownload } from '~/lib/downloads-utils';

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

  return (
    <div
      aria-label={label ?? `Gecko pose: ${pose}`}
      className={cn(
        'relative grid place-items-center rounded-xl border border-green-300/70 border-dashed bg-green-50/50 text-green-800 dark:border-green-600/50 dark:bg-green-900/20 dark:text-green-200',
        className
      )}
      role="img"
    >
      <div className="-z-10 pointer-events-none absolute inset-0 bg-[radial-gradient(400px_120px_at_50%_10%,rgba(16,185,129,0.10),transparent)]" />
      <div className="flex flex-col items-center p-3">
        <div className="font-bold text-[10px] uppercase tracking-wider opacity-70">
          Gecko Placeholder
        </div>
        <div className="mt-1 rounded-full bg-white/70 px-2 py-0.5 font-semibold text-[10px] dark:bg-gray-800/70 dark:text-gray-200">
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
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                    <NavigationMenuTrigger className="bg-transparent font-medium text-neutral-700 tracking-tight hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400">
                      Product
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ProductContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium text-neutral-700 tracking-tight hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400">
                      Solutions
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <IndividualsContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium text-neutral-700 tracking-tight hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400">
                      About
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <AboutContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className="h-9 px-4 py-2 font-medium text-neutral-700 tracking-tight hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400"
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
            className="fixed top-0 left-0 z-50 flex h-screen w-full flex-col bg-white dark:bg-gray-900"
            exit={{ x: '100vw' }}
            initial={{ x: '100vw' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between p-6">
              <Link className="flex items-center" href="/">
                <VoiceGeckoLogoText className="w-32" />
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} type="button">
                <HiX className="text-3xl text-neutral-950" />
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
                  className="w-full rounded-lg bg-green-700 px-5 py-2.5 text-center font-medium text-white transition-colors hover:bg-green-600"
                  downloadError={downloadError}
                  downloadsData={downloadsData}
                />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ===== HERO SECTION ===== */}
      <div className="relative overflow-hidden">
        {/* Brand atmospherics */}
        <div className="-z-10 pointer-events-none absolute inset-0">
          <div className="-top-[30%] absolute right-[-10%] h-[50rem] w-[50rem] rounded-[50%] bg-[radial-gradient(closest-side,rgba(16,185,129,0.15),transparent)] blur-3xl" />
          <div className="-left-24 absolute top-[30%] h-[18rem] w-[18rem] rounded-[40%] bg-emerald-200/30 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-8 md:pt-12">
          <div className="flex items-center justify-start">
            {/* Hero content */}
            <div className="max-w-4xl text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 font-medium text-neutral-700 text-xs backdrop-blur dark:border-neutral-700 dark:bg-gray-800/70 dark:text-neutral-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-600" />
                Meet Voice Gecko
              </div>

              <h1 className="mt-6 text-balance font-black text-5xl text-gray-900 tracking-tight md:text-6xl dark:text-white">
                Talk, don't type.
              </h1>
              <p className="mt-4 max-w-2xl text-pretty font-medium text-lg text-neutral-700 leading-tight md:text-xl dark:text-neutral-300">
                Stop wrestling with your keyboard. Speak naturally and get
                perfect text on your clipboard instantly. 4x faster than typing,
                100x less frustrating.
              </p>

              <div className="mt-6">
                <WindowsDownloadStrip
                  downloadError={downloadError}
                  downloadsData={downloadsData}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-start gap-4 text-neutral-600 text-xs">
                <span>Loved by 5,000+ users</span>
                <span className="hidden h-1 w-1 rounded-full bg-neutral-300 sm:block" />
                <span>10,000+ hours transcribed</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-start gap-4 text-neutral-600 text-xs">
                <span className="inline-flex items-center gap-1">
                  <FaWindows className="h-3.5 w-3.5" /> Windows available now
                </span>
                <span className="rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800">
                  Free plan included
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== WHY VOICE GECKO (Differentiation) ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight md:text-3xl dark:text-white">
          Why Voice Gecko?
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-neutral-600 text-sm dark:text-neutral-400">
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
      <section className="bg-neutral-50 py-20 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight md:text-3xl dark:text-white">
            Get more done by talking first
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-neutral-600 text-sm dark:text-neutral-400">
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
      <section className="bg-white py-20 dark:bg-gray-900">
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
              className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800"
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-semibold text-gray-900 text-lg tracking-tight dark:text-white">
                Three steps to your first transcription
              </h3>
              <ol className="mt-3 space-y-3 text-neutral-700 text-sm dark:text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-green-100 font-bold text-green-800 text-xs dark:bg-green-800 dark:text-green-200">
                    1
                  </span>
                  Download and install for Windows.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-green-100 font-bold text-green-800 text-xs dark:bg-green-800 dark:text-green-200">
                    2
                  </span>
                  Grant microphone permission.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-green-100 font-bold text-green-800 text-xs dark:bg-green-800 dark:text-green-200">
                    3
                  </span>
                  Press the shortcut and speak—your text is clipboard‑ready.
                </li>
              </ol>
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-neutral-600 text-xs dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-400">
                Note: MVP focuses on fast, reliable English transcription.
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-gray-700">
                  <p className="font-semibold text-[12px] text-neutral-700 dark:text-neutral-300">
                    Your Voice
                  </p>
                  <p className="mt-1 text-[12px] text-neutral-700 dark:text-neutral-300">
                    "Draft a recap for our sprint review, note blockers, and
                    assign owners."
                  </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
                  <p className="font-semibold text-[12px] text-green-900 dark:text-green-200">
                    Clipboard Output
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-[12px] text-green-900 dark:text-green-200">
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

      {/* ===== WORKS EVERYWHERE ===== */}
      <section className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight md:text-3xl dark:text-white">
            Works everywhere you work
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-neutral-600 text-sm dark:text-neutral-400">
            Paste into any app—or let Voice Gecko type for you.
          </p>

          <PasteAutoTypeToggle />

          <div className="mt-8">
            <Marquee
              autoFill={true}
              gradient={true}
              gradientColor="#ffffff"
              gradientWidth={100}
              pauseOnHover={true}
              speed={48}
            >
              <div className="mr-3">
                <LogoPill icon={<HiCode className="h-4 w-4" />}>
                  VS Code
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiGoogledocs className="h-4 w-4" />}>
                  Google Docs
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiNotion className="h-4 w-4" />}>
                  Notion
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiGmail className="h-4 w-4" />}>
                  Gmail
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiSlack className="h-4 w-4" />}>
                  Slack
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiJira className="h-4 w-4" />}>Jira</LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiLinear className="h-4 w-4" />}>
                  Linear
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiObsidian className="h-4 w-4" />}>
                  Obsidian
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<HiDocumentText className="h-4 w-4" />}>
                  Word
                </LogoPill>
              </div>
              <div className="mr-3">
                <LogoPill icon={<SiTrello className="h-4 w-4" />}>
                  Trello
                </LogoPill>
              </div>
            </Marquee>
          </div>
        </div>
      </section>

      {/* ===== SYSTEM UI SNAPSHOT: Tray + States ===== */}
      <section className="bg-neutral-50 py-20 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight md:text-3xl dark:text-white">
            Lightweight desktop UI
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-neutral-600 text-sm dark:text-neutral-400">
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
      <section className="bg-white py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-[.9fr_1.1fr] md:items-center">
            {/* Stats block */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
              <h3 className="font-semibold text-gray-900 text-lg tracking-tight dark:text-white">
                Trusted by people who move fast
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <StatBlock label="Hours recorded" value="10k+" />
                <StatBlock label="Free words" value="2k/wk" />
                <StatBlock label="Average rating" value="4.9/5" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-neutral-600 text-xs dark:text-neutral-400">
                <Avatar initial="SC" />
                <Avatar initial="MR" />
                <Avatar initial="EW" />
                <Avatar initial="DL" />
                <Avatar initial="AK" />
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-neutral-700 dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-300">
                  2,000+ users
                </span>
              </div>
            </div>
            {/* Testimonials carousel-ish grid */}
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
      <section className="bg-neutral-50 py-20 dark:bg-gray-800" id="pricing">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight md:text-3xl dark:text-white">
            Simple, fair pricing
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-neutral-600 text-sm dark:text-neutral-400">
            Start free. Upgrade for unlimited transcription whenever you're
            ready. English‑only for now.
          </p>

          <BillingToggle />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PriceCard
              cta="Download"
              features={[
                '2,000 words/week',
                'Instant clipboard',
                'Global shortcut',
              ]}
              highlight
              name="Free"
              price="$0"
            />
            <PriceCard
              cta="See Plans"
              features={[
                'Unlimited words',
                'Priority processing',
                'Early features',
              ]}
              name="Unlimited"
              price="$—/mo"
            />
          </div>
          <p className="mt-4 text-center text-neutral-600 text-xs dark:text-neutral-400">
            "Most clips finish in 1–2 seconds." Prices are placeholders. See the{' '}
            <Link className="underline dark:text-neutral-300" href="/pricing">
              pricing page
            </Link>{' '}
            for live updates.
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-white py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center font-bold text-2xl text-gray-900 tracking-tight md:text-3xl dark:text-white">
            FAQs
          </h2>
          <div className="mt-6 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-gray-800">
            {[
              {
                q: 'Which platforms are supported?',
                a: 'Windows is available now. macOS is on the roadmap and coming next.',
              },
              {
                q: 'How fast is transcription?',
                a: 'Most recordings are transcribed in 1–2 seconds.',
              },
              {
                q: 'Do you support multiple languages or offline mode?',
                a: 'Not yet. The current MVP focuses on fast, reliable English transcription.',
              },
              {
                q: 'Do I need an account?',
                a: 'You can use the free plan right away. An account may be required for paid features.',
              },
              {
                q: 'What happens with my audio?',
                a: "We focus on fast clipboard delivery. We won't retain audio beyond what's required for processing. Full details in our Privacy Policy.",
              },
              {
                q: 'When is macOS support coming?',
                a: "macOS is next on the roadmap. You'll be able to opt-in for a launch reminder soon.",
              },
              {
                q: 'Can it auto-type instead of paste?',
                a: 'Yes—Voice Gecko can paste or auto-type depending on your preference.',
              },
            ].map((item) => (
              <FaqItem answer={item.a} key={item.q} question={item.q} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="bg-gradient-to-b from-white to-[#e6f9ef] py-16 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h3 className="text-balance font-black text-3xl text-gray-900 tracking-tight md:text-4xl dark:text-white">
            Say it. See it. Send it.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-neutral-700 dark:text-neutral-300">
            Download Voice Gecko and speak your work into existence.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <WindowsDownloadButton
              className={cn(
                buttonVariants({ variant: 'default', size: 'xl' }),
                '!border-black rounded-lg border-2 bg-primary/80 font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02]'
              )}
              downloadError={downloadError}
              downloadsData={downloadsData}
              text="Download for Windows"
            />
            <Link
              className={cn(
                buttonVariants({ variant: 'default', size: 'xl' }),
                '!border-black rounded-lg border-2 bg-transparent font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02] hover:bg-transparent'
              )}
              href="/use-cases"
            >
              Explore Use Cases
            </Link>
          </div>
          <div className="pointer-events-none mx-auto mt-6 w-40">
            <RiveGeckoPlaceholder className="h-24 w-full" pose="wave" />
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-neutral-200 border-t bg-white dark:border-neutral-700 dark:bg-gray-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          <div>
            <h4 className="font-semibold text-neutral-900 text-sm dark:text-white">
              Product
            </h4>
            <ul className="mt-3 space-y-2 text-neutral-600 text-sm dark:text-neutral-400">
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
            <h4 className="font-semibold text-neutral-900 text-sm dark:text-white">
              Company
            </h4>
            <ul className="mt-3 space-y-2 text-neutral-600 text-sm dark:text-neutral-400">
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
            <h4 className="font-semibold text-neutral-900 text-sm dark:text-white">
              Resources
            </h4>
            <ul className="mt-3 space-y-2 text-neutral-600 text-sm dark:text-neutral-400">
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
            <h4 className="font-semibold text-neutral-900 text-sm dark:text-white">
              Legal
            </h4>
            <ul className="mt-3 space-y-2 text-neutral-600 text-sm dark:text-neutral-400">
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
        <div className="border-neutral-200 border-t dark:border-neutral-700">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-neutral-600 text-xs dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <VoiceGeckoLogoText className="w-24 opacity-80" />
              <span>© {new Date().getFullYear()} Voice Gecko</span>
            </div>
            <span>English only • Windows now • macOS next</span>
          </div>
        </div>
      </footer>

      {/* ===== STICKY CTA RIBBON ===== */}
      <StickyCta downloadError={downloadError} downloadsData={downloadsData} />
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
    <div className="relative text-neutral-950">
      {FoldContent ? (
        <button
          className="flex w-full cursor-pointer items-center justify-between border-neutral-300 border-b py-6 text-start font-semibold text-2xl"
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
          className="flex w-full cursor-pointer items-center justify-between border-neutral-300 border-b py-6 text-start font-semibold text-2xl"
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
          className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
          href="/use-cases"
        >
          <div className="flex items-start gap-3">
            <HiLightningBolt className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="mb-0.5 font-medium text-neutral-900 text-sm">
                Use Cases
              </h3>
              <p className="text-neutral-600 text-xs">
                Speak first, type less, do more
              </p>
            </div>
          </div>
        </Link>
        <Link
          className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
          href="/workflows"
        >
          <div className="flex items-start gap-3">
            <TbSparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="mb-0.5 font-medium text-neutral-900 text-sm">
                Workflows
              </h3>
              <p className="text-neutral-600 text-xs">
                Build voice-first habits
              </p>
            </div>
          </div>
        </Link>
        <Link
          className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
          href="/user-guides"
        >
          <div className="flex items-start gap-3">
            <HiBookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="mb-0.5 font-medium text-neutral-900 text-sm">
                User Guides
              </h3>
              <p className="text-neutral-600 text-xs">
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
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/leaders"
            >
              <div className="flex h-full items-start gap-3">
                <HiUsers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Leaders
                  </h4>
                  <p className="text-neutral-600 text-xs">
                    Unblock teams, move work forward
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/students"
            >
              <div className="flex h-full items-start gap-3">
                <HiBookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Students
                  </h4>
                  <p className="text-neutral-600 text-xs">
                    Capture lectures, draft essays faster
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/professionals"
            >
              <div className="flex h-full items-start gap-3">
                <HiBriefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Professionals
                  </h4>
                  <p className="text-neutral-600 text-xs">
                    Draft emails, notes, and updates on the fly
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/creators"
            >
              <div className="flex h-full items-start gap-3">
                <HiPencilAlt className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Creators
                  </h4>
                  <p className="text-neutral-600 text-xs">
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
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/case-studies/meeting-notes"
            >
              <div className="flex h-full items-start gap-3">
                <HiTrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Meeting Recaps
                  </h4>
                  <p className="text-neutral-600 text-xs">
                    Speak decisions and next steps, then paste
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/case-studies/quick-drafts"
            >
              <div className="flex h-full items-start gap-3">
                <HiDocumentText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Quick Drafts
                  </h4>
                  <p className="text-neutral-600 text-xs">
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
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/company"
            >
              <div className="flex items-start gap-3">
                <HiHeart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Company
                  </h4>
                  <p className="text-neutral-600 text-xs">
                    Our mission and the Gecko behind it
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/careers"
            >
              <div className="flex items-start gap-3">
                <HiUsers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Careers
                  </h4>
                  <p className="text-neutral-600 text-xs">
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
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/support"
            >
              <div className="flex items-start gap-3">
                <HiMail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Support
                  </h4>
                  <p className="text-neutral-600 text-xs">
                    We're here if you need a hand
                  </p>
                </div>
              </div>
            </Link>
            <Link
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
              href="/sales"
            >
              <div className="flex items-start gap-3">
                <HiPhone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <h4 className="mb-0.5 font-medium text-neutral-900 text-sm">
                    Sales
                  </h4>
                  <p className="text-neutral-600 text-xs">
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
      // If no download data, just show an alert for now
      alert(downloadError ?? 'Download currently unavailable');
      return;
    }

    const windowsPlatform = downloadsData.platforms.windows;
    const primaryDownload = getPrimaryDownload(windowsPlatform);

    if (primaryDownload) {
      // Trigger download
      const link = document.createElement('a');
      link.href = primaryDownload.url;
      link.download = primaryDownload.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Could add analytics or redirect to thank you page here
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
              '!border-black inline-flex items-center gap-2 rounded-lg border-2 bg-primary/80 font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02]'
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

// Windows Download Strip for Hero Section
const WindowsDownloadStrip = ({
  downloadsData,
  downloadError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) => {
  return (
    <div className="flex flex-col justify-start gap-3 sm:flex-row sm:items-center">
      <WindowsDownloadButton
        downloadError={downloadError}
        downloadsData={downloadsData}
        text="Download for Windows"
      />
      <Link
        className={cn(
          buttonVariants({ variant: 'default', size: 'xl' }),
          '!border-black rounded-lg border-2 bg-transparent font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02] hover:bg-transparent'
        )}
        href="/pricing"
      >
        See Pricing
      </Link>
    </div>
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
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 font-semibold text-[10px] text-green-900 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200">
      {tag}
    </div>
    <h3 className="mt-3 font-semibold text-base text-gray-900 tracking-tight dark:text-white">
      {title}
    </h3>
    <p className="mt-1 text-neutral-600 text-sm dark:text-neutral-400">
      {body}
    </p>
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
  <div className="group hover:-translate-y-0.5 rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:shadow-xl dark:border-neutral-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-gray-900 tracking-tight dark:text-white">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10 w-auto" pose={pose} />
    </div>
    <ul className="mt-3 list-disc space-y-1 pl-5 text-neutral-700 text-sm dark:text-neutral-300">
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
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-green-700 dark:border-neutral-600 dark:bg-gray-700 dark:text-green-400">
        {icon}
      </div>
      <h3 className="font-semibold text-base text-gray-900 tracking-tight dark:text-white">
        {title}
      </h3>
    </div>
    <p className="mt-3 text-neutral-600 text-sm dark:text-neutral-400">
      {body}
    </p>
  </div>
);

const LogoPill = ({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-700 text-xs dark:border-neutral-600 dark:bg-gray-800 dark:text-neutral-300">
    {icon && (
      <div className="text-neutral-500 dark:text-neutral-400">{icon}</div>
    )}{' '}
    {children}
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
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-gray-900 tracking-tight dark:text-white">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10" pose={pose} />
    </div>
    <p className="mt-2 text-neutral-700 text-sm dark:text-neutral-300">
      {body}
    </p>
    <div className="mt-4 h-24 rounded-lg border border-neutral-200 bg-neutral-50 text-center text-neutral-500 text-xs dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-400">
      <div className="grid h-full place-items-center">
        Placeholder: UI state visual
      </div>
    </div>
  </div>
);

const StatBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center dark:border-neutral-600 dark:bg-gray-700">
    <div className="font-black text-green-700 text-xl dark:text-green-400">
      {value}
    </div>
    <div className="mt-1 text-neutral-600 text-xs dark:text-neutral-400">
      {label}
    </div>
  </div>
);

const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 font-bold text-[11px] text-green-800 dark:bg-green-800 dark:text-green-200">
    {initial}
  </div>
);

const PriceCard = ({
  name,
  price,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      'rounded-2xl border p-6',
      highlight
        ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
        : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-gray-800'
    )}
  >
    <p className="font-semibold text-neutral-900 text-sm dark:text-white">
      {name}
    </p>
    <p className="mt-1 font-black text-2xl text-gray-900 dark:text-white">
      {price}
    </p>
    <ul className="mt-3 space-y-1 text-neutral-700 text-sm dark:text-neutral-300">
      {features.map((f, i) => (
        <li key={`${f.slice(0, 20)}-${i}`}>• {f}</li>
      ))}
    </ul>
    <div className="mt-4 text-center">
      <Link
        className={cn(
          buttonVariants({ variant: 'default', size: 'lg' }),
          '!border-black inline-flex rounded-lg border-2 bg-primary/80 font-semibold text-xs tracking-tight hover:scale-[1.01]'
        )}
        href="/pricing"
      >
        {cta}
      </Link>
    </div>
  </div>
);

const FaqItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="px-4 py-4">
      <button
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="font-semibold text-neutral-900 text-sm dark:text-white">
          {question}
        </span>
        <span className="text-neutral-900 text-xl leading-none dark:text-white">
          {open ? '−' : '+'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden pt-2 text-neutral-700 text-sm dark:text-neutral-300"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
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
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
    <blockquote className="text-neutral-700 text-sm dark:text-neutral-300">
      "{quote}"
    </blockquote>
    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-800 text-sm dark:bg-green-800 dark:text-green-200">
        {avatar}
      </div>
      <div>
        <p className="font-semibold text-neutral-900 text-sm dark:text-white">
          {author}
        </p>
        <p className="text-neutral-600 text-xs dark:text-neutral-400">
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
          className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(96%,56rem)] rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur dark:border-neutral-700 dark:bg-gray-800/90"
          exit={{ y: 80, opacity: 0 }}
          initial={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <RiveGeckoPlaceholder className="h-10 w-auto" pose="peek" />
              <p className="text-neutral-700 text-sm dark:text-neutral-300">
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
              <Link
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  '!border-black rounded-lg border-2 bg-transparent font-semibold text-xs tracking-tight hover:scale-[1.01]'
                )}
                href="/pricing"
              >
                Pricing
              </Link>
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

      // For demo, treat Meta+Shift+G or Ctrl+Shift+G as trigger across OS
      if (isWindowsCombo) {
        e.preventDefault();
        setPhase('listening');
        setHint('Listening… speak your thought');
        setTimeout(() => {
          setPhase('done');
          setHint('Transcribed! Copied to clipboard');
          // Fake clipboard success flair
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
      className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-semibold text-gray-900 text-lg tracking-tight dark:text-white">
        Try the shortcut
      </h3>
      <p className="mt-1 text-neutral-700 text-sm dark:text-neutral-300">
        Press{' '}
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 text-gray-900 dark:border-neutral-600 dark:bg-gray-700 dark:text-white">
          ⊞
        </kbd>{' '}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 text-gray-900 dark:border-neutral-600 dark:bg-gray-700 dark:text-white">
          Shift
        </kbd>{' '}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 text-gray-900 dark:border-neutral-600 dark:bg-gray-700 dark:text-white">
          G
        </kbd>
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-gray-700">
          <p className="font-semibold text-[12px] text-neutral-700 dark:text-neutral-300">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                (() => {
                  if (phase === 'idle') {
                    return 'bg-neutral-300 dark:bg-neutral-600';
                  }
                  if (phase === 'listening') {
                    return 'bg-green-500';
                  }
                  return 'bg-green-700 dark:bg-green-600';
                })()
              )}
            />
            <span className="font-medium text-gray-900 dark:text-white">
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
          <div className="mt-3 rounded-md border border-neutral-300 border-dashed bg-white p-2 text-[12px] text-neutral-600 dark:border-neutral-600 dark:bg-gray-800 dark:text-neutral-400">
            {hint}
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
          <p className="font-semibold text-[12px] text-green-900 dark:text-green-200">
            Clipboard Output (demo)
          </p>
          <div className="mt-1 min-h-14 text-[12px] text-green-900 dark:text-green-200">
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

      <div className="mt-4 flex items-center gap-2 text-neutral-600 text-xs">
        <HiSparkles className="h-4 w-4 text-green-700" />
        <span>This is a playful demo—no mic required.</span>
      </div>
    </motion.div>
  );
};

/* =========================
   WORKS EVERYWHERE: Paste vs Auto-type toggle (illustrative only)
   ========================= */

const PasteAutoTypeToggle = () => {
  const [mode, setMode] = useState<'paste' | 'type'>('paste');
  return (
    <div className="mx-auto mt-5 max-w-lg rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-gray-800">
      <div className="grid grid-cols-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1 text-sm dark:border-neutral-600 dark:bg-gray-700">
        <button
          className={cn(
            'rounded-md px-3 py-1.5 font-medium transition',
            mode === 'paste'
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-gray-800 dark:text-white'
              : 'text-neutral-600 dark:text-neutral-400'
          )}
          onClick={() => setMode('paste')}
          type="button"
        >
          Paste
        </button>
        <button
          className={cn(
            'rounded-md px-3 py-1.5 font-medium transition',
            mode === 'type'
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-gray-800 dark:text-white'
              : 'text-neutral-600 dark:text-neutral-400'
          )}
          onClick={() => setMode('type')}
          type="button"
        >
          Auto‑type
        </button>
      </div>
      <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-center text-neutral-700 text-xs dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-300">
        {mode === 'paste'
          ? 'Voice Gecko copies your text—press paste anywhere.'
          : 'Voice Gecko can type the text into your focused app.'}
      </div>
    </div>
  );
};

/* =========================
   BILLING TOGGLE (non-functional placeholder)
   ========================= */

const BillingToggle = () => {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  return (
    <div className="mx-auto mt-5 flex w-full max-w-xs items-center justify-center gap-2">
      <button
        className={cn(
          'rounded-lg border px-3 py-1 text-sm',
          period === 'monthly'
            ? 'border-green-300 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200'
            : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-gray-800 dark:text-neutral-300'
        )}
        onClick={() => setPeriod('monthly')}
        type="button"
      >
        Monthly
      </button>
      <button
        className={cn(
          'rounded-lg border px-3 py-1 text-sm',
          period === 'yearly'
            ? 'border-green-300 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200'
            : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-gray-800 dark:text-neutral-300'
        )}
        onClick={() => setPeriod('yearly')}
        type="button"
      >
        Yearly
      </button>
    </div>
  );
};
