"use client";

import type { Dispatch, SetStateAction } from "react";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import GeckoInvisibleWall from "public/assets/images/geckos/gecko-invisible-wall.png";
import GeckoPointingWithStick from "public/assets/images/geckos/gecko-pointing-with-stick.png";
import GeckoWelcomeSign from "public/assets/images/geckos/gecko-welcome-sign.png";
import GeckoWorker from "public/assets/images/geckos/gecko-worker.png";
import Marquee from "react-fast-marquee";
import { FaWindows } from "react-icons/fa";
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
} from "react-icons/hi";
import {
  SiGmail,
  SiGoogledocs,
  SiJira,
  SiLinear,
  SiNotion,
  SiObsidian,
  SiSlack,
  SiTrello,
} from "react-icons/si";
import { TbSparkles } from "react-icons/tb";

import VoiceGeckoLogoText from "@acme/ui/components/logos/logo-text";
import { buttonVariants } from "@acme/ui/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@acme/ui/components/ui/navigation-menu";
import { cn } from "@acme/ui/lib/utils";

import type { DownloadsData } from "~/lib/downloads-utils";
import { getPrimaryDownload } from "~/lib/downloads-utils";

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
  pose = "idle",
  label,
  className,
}: {
  pose?: "idle" | "wave" | "point" | "run" | "jump" | "peek" | "float";
  label?: string;
  className?: string;
}) {
  // Use static images for some poses to reduce animation workload
  if (pose === "peek") {
    return (
      <Image
        src={GeckoInvisibleWall}
        alt="Gecko peeking"
        className={cn("size-auto", className)}
      />
    );
  }

  if (pose === "wave") {
    return (
      <Image
        src={GeckoWelcomeSign}
        alt="Gecko waving"
        className={cn("size-auto", className)}
      />
    );
  }

  if (pose === "point") {
    return (
      <Image
        src={GeckoPointingWithStick}
        alt="Gecko pointing"
        className={cn("size-auto", className)}
      />
    );
  }

  if (pose === "float") {
    return (
      <Image
        src={GeckoWorker}
        alt="Gecko running"
        className={cn("size-auto", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-xl border border-dashed border-green-300/70 bg-green-50/50 text-green-800 dark:border-green-600/50 dark:bg-green-900/20 dark:text-green-200",
        className,
      )}
      aria-label={label ?? `Gecko pose: ${pose}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(400px_120px_at_50%_10%,rgba(16,185,129,0.10),transparent)]" />
      <div className="flex flex-col items-center p-3">
        <div className="text-[10px] font-bold tracking-wider uppercase opacity-70">
          Gecko Placeholder
        </div>
        <div className="mt-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold dark:bg-gray-800/70 dark:text-gray-200">
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
    <>
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
                      <NavigationMenuTrigger className="bg-transparent font-medium tracking-tight text-neutral-700 hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400">
                        Product
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ProductContent />
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent font-medium tracking-tight text-neutral-700 hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400">
                        Solutions
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <IndividualsContent />
                      </NavigationMenuContent>
                    </NavigationMenuItem>

                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent font-medium tracking-tight text-neutral-700 hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400">
                        About
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <AboutContent />
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        href="/pricing"
                        className="h-9 px-4 py-2 font-medium tracking-tight text-neutral-700 hover:text-green-700 dark:text-neutral-300 dark:hover:text-green-400"
                      >
                        Pricing
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
                <WindowsDownloadButton
                  downloadsData={downloadsData}
                  downloadError={downloadError}
                />
              </div>

              {/* Mobile Menu Button */}
              <div className="block lg:hidden">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="block text-3xl"
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
              initial={{ x: "100vw" }}
              animate={{ x: 0 }}
              exit={{ x: "100vw" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-0 left-0 z-50 flex h-screen w-full flex-col bg-white dark:bg-gray-900"
            >
              <div className="flex items-center justify-between p-6">
                <Link href="/" className="flex items-center">
                  <VoiceGeckoLogoText className="w-32" />
                </Link>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <HiX className="text-3xl text-neutral-950" />
                </button>
              </div>
              <div className="h-screen overflow-y-scroll p-6">
                <MobileMenuLink
                  href="/product"
                  FoldContent={ProductContent}
                  setMenuOpen={setMobileMenuOpen}
                >
                  Product
                </MobileMenuLink>
                <MobileMenuLink
                  href="/solutions"
                  FoldContent={IndividualsContent}
                  setMenuOpen={setMobileMenuOpen}
                >
                  Solutions
                </MobileMenuLink>
                <MobileMenuLink href="/pricing" setMenuOpen={setMobileMenuOpen}>
                  Pricing
                </MobileMenuLink>
                <MobileMenuLink
                  href="/about"
                  FoldContent={AboutContent}
                  setMenuOpen={setMobileMenuOpen}
                >
                  About
                </MobileMenuLink>
              </div>
              <div className="p-6">
                <div className="w-full">
                  <WindowsDownloadButton
                    downloadsData={downloadsData}
                    downloadError={downloadError}
                    className="w-full rounded-lg bg-green-700 px-5 py-2.5 text-center font-medium text-white transition-colors hover:bg-green-600"
                  />
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* ===== HERO SECTION ===== */}
        <div className="relative overflow-hidden">
          {/* Brand atmospherics */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-[30%] right-[-10%] h-[50rem] w-[50rem] rounded-[50%] bg-[radial-gradient(closest-side,rgba(16,185,129,0.15),transparent)] blur-3xl" />
            <div className="absolute top-[30%] -left-24 h-[18rem] w-[18rem] rounded-[40%] bg-emerald-200/30 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-6 pt-8 md:pt-12">
            <div className="flex items-center justify-start">
              {/* Hero content */}
              <div className="max-w-4xl text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur dark:border-neutral-700 dark:bg-gray-800/70 dark:text-neutral-300">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-600" />
                  Meet Voice Gecko
                </div>

                <h1 className="mt-6 text-5xl font-black tracking-tight text-balance text-gray-900 md:text-6xl dark:text-white">
                  Talk, don't type.
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-tight font-medium text-pretty text-neutral-700 md:text-xl dark:text-neutral-300">
                  Stop wrestling with your keyboard. Speak naturally and get
                  perfect text on your clipboard instantly. 4x faster than
                  typing, 100x less frustrating.
                </p>

                <div className="mt-6">
                  <WindowsDownloadStrip
                    downloadsData={downloadsData}
                    downloadError={downloadError}
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-start gap-4 text-xs text-neutral-600">
                  <span>Loved by 5,000+ users</span>
                  <span className="hidden h-1 w-1 rounded-full bg-neutral-300 sm:block" />
                  <span>10,000+ hours transcribed</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-start gap-4 text-xs text-neutral-600">
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
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
            Why Voice Gecko?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-400">
            Built for speed and flow: English-only MVP that gets out of your way
            and onto your clipboard.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <WhyCard
              title="Blazing fast"
              body="Most transcriptions land on your clipboard in 1–2 seconds."
              tag="Speed"
            />
            <WhyCard
              title="Clipboard‑first"
              body="Skip exports and menus—your text is ready where you need it."
              tag="Flow"
            />
            <WhyCard
              title="Simple by design"
              body="One shortcut, clean output, minimal UI. Get in, get out."
              tag="Simplicity"
            />
          </div>
        </section>

        {/* ===== USE CASES BY OUTCOME ===== */}
        <section className="bg-neutral-50 py-20 dark:bg-gray-800">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
              Get more done by talking first
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-400">
              Outcomes across roles—draft faster, document decisions, never lose
              ideas, and respond quickly.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-4">
              <OutcomeCard
                title="Draft faster"
                bullets={[
                  "Blog outlines without the blank page",
                  "Ticket descriptions while you think",
                  "Emails in minutes, not half an hour",
                ]}
                pose="point"
              />
              <OutcomeCard
                title="Document decisions"
                bullets={[
                  "Summarize meetings as they end",
                  "Paste action items instantly",
                  "Keep momentum with clear next steps",
                ]}
                pose="peek"
              />
              <OutcomeCard
                title="Never lose ideas"
                bullets={[
                  "Capture sparks mid‑flow",
                  "Turn thoughts into bullet points",
                  "Keep context with zero friction",
                ]}
                pose="float"
              />
              <OutcomeCard
                title="Respond quickly"
                bullets={[
                  "Draft replies on the go",
                  "Drop into chat, docs, or tickets",
                  "Move work forward faster",
                ]}
                pose="run"
              />
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS + SHORTCUT PLAYGROUND ===== */}
        <section className="bg-white py-20 dark:bg-gray-900">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-start gap-10 md:grid-cols-3">
              <HowItWorksItem
                icon={<HiMicrophone className="h-5 w-5" />}
                title="Just talk"
                body="Hit the shortcut and brain‑dump. No rituals, no clutter."
              />
              <HowItWorksItem
                icon={<HiLightningBolt className="h-5 w-5" />}
                title="Fast turnaround"
                body="Most clips are transcribed in under two seconds."
              />
              <HowItWorksItem
                icon={<TbSparkles className="h-5 w-5" />}
                title="Ready to paste"
                body="Clean text lands on your clipboard automatically."
              />
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_.8fr]">
              <motion.div
                className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                  Three steps to your first transcription
                </h3>
                <ol className="mt-3 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-green-100 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">
                      1
                    </span>
                    Download and install for Windows.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-green-100 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">
                      2
                    </span>
                    Grant microphone permission.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-green-100 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">
                      3
                    </span>
                    Press the shortcut and speak—your text is clipboard‑ready.
                  </li>
                </ol>
                <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-400">
                  Note: MVP focuses on fast, reliable English transcription.
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-gray-700">
                    <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
                      Your Voice
                    </p>
                    <p className="mt-1 text-[12px] text-neutral-700 dark:text-neutral-300">
                      "Draft a recap for our sprint review, note blockers, and
                      assign owners."
                    </p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
                    <p className="text-[12px] font-semibold text-green-900 dark:text-green-200">
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
            <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
              Works everywhere you work
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-400">
              Paste into any app—or let Voice Gecko type for you.
            </p>

            <PasteAutoTypeToggle />

            <div className="mt-8">
              <Marquee
                speed={48}
                gradient={true}
                gradientColor="#ffffff"
                gradientWidth={100}
                pauseOnHover={true}
                autoFill={true}
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
                  <LogoPill icon={<SiJira className="h-4 w-4" />}>
                    Jira
                  </LogoPill>
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
            <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
              Lightweight desktop UI
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-400">
              Stays out of your way. Access from the system tray, speak, paste,
              and carry on.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <UiTile
                title="Tray icon"
                body="One click to open the recorder and see status."
                pose="peek"
              />
              <UiTile
                title="Listening"
                body="Press the shortcut—watch the meter, say your piece."
                pose="run"
              />
              <UiTile
                title="Processing"
                body="In a blink, text is cleaned and copied to your clipboard."
                pose="float"
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
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                  Trusted by people who move fast
                </h3>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <StatBlock value="10k+" label="Hours recorded" />
                  <StatBlock value="2k/wk" label="Free words" />
                  <StatBlock value="4.9/5" label="Average rating" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
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
                  quote="Saved me ~45 minutes a day on documentation. I just talk through changes and paste."
                  author="Marcus Rodriguez"
                  role="Software Engineer"
                  company="InnovateAI"
                  avatar="MR"
                />
                <TestimonialCard
                  quote="Brainstorm, outline, draft—all by voice. I move so much faster."
                  author="Sarah Chen"
                  role="Content Manager"
                  company="TechFlow"
                  avatar="SC"
                />
                <TestimonialCard
                  quote="Meetings end with clear notes and owners. It keeps us in motion."
                  author="Emily Watson"
                  role="Product Lead"
                  company="DataSync"
                  avatar="EW"
                />
                <TestimonialCard
                  quote="Prompts, emails, and tickets—talk first, paste, ship."
                  author="Alex Kim"
                  role="Founder"
                  company="SprintOps"
                  avatar="AK"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section className="bg-neutral-50 py-20 dark:bg-gray-800" id="pricing">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
              Simple, fair pricing
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-400">
              Start free. Upgrade for unlimited transcription whenever you're
              ready. English‑only for now.
            </p>

            <BillingToggle />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PriceCard
                name="Free"
                price="$0"
                cta="Download"
                features={[
                  "2,000 words/week",
                  "Instant clipboard",
                  "Global shortcut",
                ]}
                highlight
              />
              <PriceCard
                name="Unlimited"
                price="$—/mo"
                cta="See Plans"
                features={[
                  "Unlimited words",
                  "Priority processing",
                  "Early features",
                ]}
              />
            </div>
            <p className="mt-4 text-center text-xs text-neutral-600 dark:text-neutral-400">
              "Most clips finish in 1–2 seconds." Prices are placeholders. See
              the{" "}
              <Link href="/pricing" className="underline dark:text-neutral-300">
                pricing page
              </Link>{" "}
              for live updates.
            </p>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="bg-white py-20 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white">
              FAQs
            </h2>
            <div className="mt-6 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-gray-800">
              {[
                {
                  q: "Which platforms are supported?",
                  a: "Windows is available now. macOS is on the roadmap and coming next.",
                },
                {
                  q: "How fast is transcription?",
                  a: "Most recordings are transcribed in 1–2 seconds.",
                },
                {
                  q: "Do you support multiple languages or offline mode?",
                  a: "Not yet. The current MVP focuses on fast, reliable English transcription.",
                },
                {
                  q: "Do I need an account?",
                  a: "You can use the free plan right away. An account may be required for paid features.",
                },
                {
                  q: "What happens with my audio?",
                  a: "We focus on fast clipboard delivery. We won't retain audio beyond what's required for processing. Full details in our Privacy Policy.",
                },
                {
                  q: "When is macOS support coming?",
                  a: "macOS is next on the roadmap. You'll be able to opt-in for a launch reminder soon.",
                },
                {
                  q: "Can it auto-type instead of paste?",
                  a: "Yes—Voice Gecko can paste or auto-type depending on your preference.",
                },
              ].map((item, idx) => (
                <FaqItem key={idx} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="bg-gradient-to-b from-white to-[#e6f9ef] py-16 dark:from-gray-900 dark:to-gray-800">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h3 className="text-3xl font-black tracking-tight text-balance text-gray-900 md:text-4xl dark:text-white">
              Say it. See it. Send it.
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-neutral-700 dark:text-neutral-300">
              Download Voice Gecko and speak your work into existence.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <WindowsDownloadButton
                downloadsData={downloadsData}
                downloadError={downloadError}
                className={cn(
                  buttonVariants({ variant: "default", size: "xl" }),
                  "bg-primary/80 rounded-lg border-2 !border-black text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02]",
                )}
                text="Download for Windows"
              />
              <Link
                href="/use-cases"
                className={cn(
                  buttonVariants({ variant: "default", size: "xl" }),
                  "rounded-lg border-2 !border-black bg-transparent text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02] hover:bg-transparent",
                )}
              >
                Explore Use Cases
              </Link>
            </div>
            <div className="pointer-events-none mx-auto mt-6 w-40">
              <RiveGeckoPlaceholder pose="wave" className="h-24 w-full" />
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-gray-900">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Product
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li>
                  <Link href="/pricing" className="hover:underline">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/use-cases" className="hover:underline">
                    Use Cases
                  </Link>
                </li>
                <li>
                  <Link href="/changelog" className="hover:underline">
                    Changelog
                  </Link>
                </li>
                <li>
                  <Link href="/roadmap" className="hover:underline">
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Company
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li>
                  <Link href="/company" className="hover:underline">
                    Company
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:underline">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/press" className="hover:underline">
                    Press Kit
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:underline">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Resources
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li>
                  <Link href="/support" className="hover:underline">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/user-guides" className="hover:underline">
                    User Guides
                  </Link>
                </li>
                <li>
                  <Link href="/workflows" className="hover:underline">
                    Workflows
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:underline">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Legal
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li>
                  <Link href="/privacy" className="hover:underline">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:underline">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/eula" className="hover:underline">
                    EULA
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:underline">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-700">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <VoiceGeckoLogoText className="w-24 opacity-80" />
                <span>© {new Date().getFullYear()} Voice Gecko</span>
              </div>
              <span>English only • Windows now • macOS next</span>
            </div>
          </div>
        </footer>

        {/* ===== STICKY CTA RIBBON ===== */}
        <StickyCta
          downloadsData={downloadsData}
          downloadError={downloadError}
        />
      </div>
    </>
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
        <div
          className="flex w-full cursor-pointer items-center justify-between border-b border-neutral-300 py-6 text-start text-2xl font-semibold"
          onClick={() => setOpen((pv) => !pv)}
        >
          <Link
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }}
            href={href}
          >
            {children}
          </Link>
          <motion.div
            animate={{ rotate: open ? "180deg" : "0deg" }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            <HiChevronDown />
          </motion.div>
        </div>
      ) : (
        <Link
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
          href={href}
          className="flex w-full cursor-pointer items-center justify-between border-b border-neutral-300 py-6 text-start text-2xl font-semibold"
        >
          <span>{children}</span>
          <HiArrowRight />
        </Link>
      )}
      {FoldContent && (
        <motion.div
          initial={false}
          animate={{
            height: open ? height : "0px",
            marginBottom: open ? "24px" : "0px",
            marginTop: open ? "12px" : "0px",
          }}
          className="overflow-hidden"
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
      <h2 className="text-muted-foreground/60 mb-1 text-xs font-semibold">
        Getting Started
      </h2>
      <div className="-mx-2 space-y-1">
        <Link
          href="/use-cases"
          className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
        >
          <div className="flex items-start gap-3">
            <HiLightningBolt className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <h3 className="mb-0.5 text-sm font-medium text-neutral-900">
                Use Cases
              </h3>
              <p className="text-xs text-neutral-600">
                Speak first, type less, do more
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/workflows"
          className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
        >
          <div className="flex items-start gap-3">
            <TbSparkles className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <h3 className="mb-0.5 text-sm font-medium text-neutral-900">
                Workflows
              </h3>
              <p className="text-xs text-neutral-600">
                Build voice-first habits
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/user-guides"
          className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
        >
          <div className="flex items-start gap-3">
            <HiBookOpen className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <h3 className="mb-0.5 text-sm font-medium text-neutral-900">
                User Guides
              </h3>
              <p className="text-xs text-neutral-600">
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
          <h3 className="text-muted-foreground/60 mb-1 text-xs font-semibold">
            Voice Gecko for
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              href="/leaders"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiUsers className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Leaders
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Unblock teams, move work forward
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/students"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiBookOpen className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Students
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Capture lectures, draft essays faster
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/professionals"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiBriefcase className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Professionals
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Draft emails, notes, and updates on the fly
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/creators"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiPencilAlt className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Creators
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Capture ideas and outlines anywhere
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="space-y-2 sm:pl-3">
          <h3 className="text-muted-foreground/60 mb-1 text-xs font-semibold">
            Popular flows
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              href="/case-studies/meeting-notes"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiTrendingUp className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Meeting Recaps
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Speak decisions and next steps, then paste
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/case-studies/quick-drafts"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiDocumentText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Quick Drafts
                  </h4>
                  <p className="text-xs text-neutral-600">
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
          <h3 className="text-muted-foreground/60 mb-1 text-xs font-semibold">
            Learn about Voice Gecko
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              href="/company"
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex items-start gap-3">
                <HiHeart className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Company
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Our mission and the Gecko behind it
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/careers"
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex items-start gap-3">
                <HiUsers className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Careers
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Help shape voice-first computing
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-muted-foreground/60 mb-1 text-xs font-semibold">
            Get Help
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              href="/support"
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex items-start gap-3">
                <HiMail className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Support
                  </h4>
                  <p className="text-xs text-neutral-600">
                    We're here if you need a hand
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/sales"
              className="block rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex items-start gap-3">
                <HiPhone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Sales
                  </h4>
                  <p className="text-xs text-neutral-600">
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
  className = "",
  text = "Download",
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
  className?: string;
  text?: string;
}) => {
  const handleDownload = () => {
    if (!downloadsData || downloadError) {
      // If no download data, just show an alert for now
      alert(downloadError ?? "Download currently unavailable");
      return;
    }

    const windowsPlatform = downloadsData.platforms.windows;
    const primaryDownload = getPrimaryDownload(windowsPlatform);

    if (primaryDownload) {
      // Trigger download
      const link = document.createElement("a");
      link.href = primaryDownload.url;
      link.download = primaryDownload.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Could add analytics or redirect to thank you page here
      console.log("Download initiated:", primaryDownload.name);
    } else {
      alert("Windows download not available");
    }
  };

  const isAvailable =
    downloadsData &&
    !downloadError &&
    downloadsData.platforms.windows.available;

  return (
    <button
      onClick={handleDownload}
      disabled={!isAvailable}
      className={cn(
        isAvailable
          ? cn(
              buttonVariants({ variant: "default", size: "xl" }),
              "bg-primary/80 inline-flex items-center gap-2 rounded-lg border-2 !border-black text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02]",
            )
          : cn(
              buttonVariants({ variant: "default", size: "xl" }),
              "inline-flex cursor-not-allowed items-center gap-2 rounded-lg border-2 !border-gray-600 bg-gray-400 text-sm font-semibold tracking-tight",
            ),
        className,
      )}
    >
      <FaWindows className="h-4 w-4" />
      {isAvailable ? text : "Download Unavailable"}
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
        downloadsData={downloadsData}
        downloadError={downloadError}
        text="Download for Windows"
      />
      <Link
        href="/pricing"
        className={cn(
          buttonVariants({ variant: "default", size: "xl" }),
          "rounded-lg border-2 !border-black bg-transparent text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02] hover:bg-transparent",
        )}
      >
        See Pricing
      </Link>
    </div>
  );
};

const Check = () => (
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
    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-900 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200">
      {tag}
    </div>
    <h3 className="mt-3 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
      {title}
    </h3>
    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
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
  pose: "point" | "peek" | "float" | "run";
}) => (
  <div className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-neutral-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10 w-auto" pose={pose} />
    </div>
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
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
      <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
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
  <div className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 dark:border-neutral-600 dark:bg-gray-800 dark:text-neutral-300">
    {icon && (
      <div className="text-neutral-500 dark:text-neutral-400">{icon}</div>
    )}{" "}
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
  pose: "peek" | "run" | "float";
}) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10" pose={pose} />
    </div>
    <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
      {body}
    </p>
    <div className="mt-4 h-24 rounded-lg border border-neutral-200 bg-neutral-50 text-center text-xs text-neutral-500 dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-400">
      <div className="grid h-full place-items-center">
        Placeholder: UI state visual
      </div>
    </div>
  </div>
);

const StatBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center dark:border-neutral-600 dark:bg-gray-700">
    <div className="text-xl font-black text-green-700 dark:text-green-400">
      {value}
    </div>
    <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
      {label}
    </div>
  </div>
);

const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-800 dark:bg-green-800 dark:text-green-200">
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
      "rounded-2xl border p-6",
      highlight
        ? "border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
        : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-gray-800",
    )}
  >
    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
      {name}
    </p>
    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
      {price}
    </p>
    <ul className="mt-3 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
      {features.map((f, i) => (
        <li key={i}>• {f}</li>
      ))}
    </ul>
    <div className="mt-4 text-center">
      <Link
        href={
          name === "Free"
            ? "/pricing"
            : name === "Unlimited"
              ? "/pricing"
              : "/pricing"
        }
        className={cn(
          buttonVariants({ variant: "default", size: "lg" }),
          "bg-primary/80 inline-flex rounded-lg border-2 !border-black text-xs font-semibold tracking-tight hover:scale-[1.01]",
        )}
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
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
          {question}
        </span>
        <span className="text-xl leading-none text-neutral-900 dark:text-white">
          {open ? "−" : "+"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pt-2 text-sm text-neutral-700 dark:text-neutral-300"
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
  role,
  company,
  avatar,
}: {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
}) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800">
    <blockquote className="text-sm text-neutral-700 dark:text-neutral-300">
      "{quote}"
    </blockquote>
    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800 dark:bg-green-800 dark:text-green-200">
        {avatar}
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
          {author}
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {role} at {company}
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
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(96%,56rem)] rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur dark:border-neutral-700 dark:bg-gray-800/90"
        >
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <RiveGeckoPlaceholder pose="peek" className="h-10 w-auto" />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Turn speech into text in seconds, not minutes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WindowsDownloadButton
                downloadsData={downloadsData}
                downloadError={downloadError}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "bg-primary/80 rounded-lg border-2 !border-black text-xs font-semibold tracking-tight hover:scale-[1.01]",
                )}
                text="Download for Windows"
              />
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "rounded-lg border-2 !border-black bg-transparent text-xs font-semibold tracking-tight hover:scale-[1.01]",
                )}
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
  const [phase, setPhase] = useState<"idle" | "listening" | "done">("idle");
  const [hint, setHint] = useState<string>("Press ⊞ Win+Shift+G to try it");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isWindowsCombo =
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key.toLowerCase() === "g" || e.code === "KeyG");

      // For demo, treat Meta+Shift+G or Ctrl+Shift+G as trigger across OS
      if (isWindowsCombo) {
        e.preventDefault();
        setPhase("listening");
        setHint("Listening… speak your thought");
        setTimeout(() => {
          setPhase("done");
          setHint("Transcribed! Copied to clipboard");
          // Fake clipboard success flair
        }, 900);
        setTimeout(() => {
          setPhase("idle");
          setHint("Press ⊞ Win+Shift+G to try it");
        }, 2200);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-gray-800"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
        Try the shortcut
      </h3>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
        Press{" "}
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 text-gray-900 dark:border-neutral-600 dark:bg-gray-700 dark:text-white">
          ⊞
        </kbd>{" "}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 text-gray-900 dark:border-neutral-600 dark:bg-gray-700 dark:text-white">
          Shift
        </kbd>{" "}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 text-gray-900 dark:border-neutral-600 dark:bg-gray-700 dark:text-white">
          G
        </kbd>
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-600 dark:bg-gray-700">
          <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                phase === "idle"
                  ? "bg-neutral-300 dark:bg-neutral-600"
                  : phase === "listening"
                    ? "bg-green-500"
                    : "bg-green-700 dark:bg-green-600",
              )}
            />
            <span className="font-medium text-gray-900 dark:text-white">
              {phase === "idle"
                ? "Idle"
                : phase === "listening"
                  ? "Listening"
                  : "Transcribed"}
            </span>
          </div>
          <div className="mt-3 rounded-md border border-dashed border-neutral-300 bg-white p-2 text-[12px] text-neutral-600 dark:border-neutral-600 dark:bg-gray-800 dark:text-neutral-400">
            {hint}
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
          <p className="text-[12px] font-semibold text-green-900 dark:text-green-200">
            Clipboard Output (demo)
          </p>
          <div className="mt-1 min-h-14 text-[12px] text-green-900 dark:text-green-200">
            {phase === "idle" && (
              <span className="opacity-60">Your text will appear here…</span>
            )}
            {phase === "listening" && (
              <span className="opacity-80">"Let's draft sprint notes…"</span>
            )}
            {phase === "done" && (
              <ul className="list-disc pl-4">
                <li>Summary of sprint</li>
                <li>Blockers highlighted</li>
                <li>Owners assigned with next steps</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-600">
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
  const [mode, setMode] = useState<"paste" | "type">("paste");
  return (
    <div className="mx-auto mt-5 max-w-lg rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-gray-800">
      <div className="grid grid-cols-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1 text-sm dark:border-neutral-600 dark:bg-gray-700">
        <button
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition",
            mode === "paste"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-neutral-600 dark:text-neutral-400",
          )}
          onClick={() => setMode("paste")}
        >
          Paste
        </button>
        <button
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition",
            mode === "type"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-neutral-600 dark:text-neutral-400",
          )}
          onClick={() => setMode("type")}
        >
          Auto‑type
        </button>
      </div>
      <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-center text-xs text-neutral-700 dark:border-neutral-600 dark:bg-gray-700 dark:text-neutral-300">
        {mode === "paste"
          ? "Voice Gecko copies your text—press paste anywhere."
          : "Voice Gecko can type the text into your focused app."}
      </div>
    </div>
  );
};

/* =========================
   BILLING TOGGLE (non-functional placeholder)
   ========================= */

const BillingToggle = () => {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  return (
    <div className="mx-auto mt-5 flex w-full max-w-xs items-center justify-center gap-2">
      <button
        onClick={() => setPeriod("monthly")}
        className={cn(
          "rounded-lg border px-3 py-1 text-sm",
          period === "monthly"
            ? "border-green-300 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200"
            : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-gray-800 dark:text-neutral-300",
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => setPeriod("yearly")}
        className={cn(
          "rounded-lg border px-3 py-1 text-sm",
          period === "yearly"
            ? "border-green-300 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-900/20 dark:text-green-200"
            : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-gray-800 dark:text-neutral-300",
        )}
      >
        Yearly
      </button>
    </div>
  );
};
