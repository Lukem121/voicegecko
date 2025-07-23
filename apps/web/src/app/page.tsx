"use client";

import type { Dispatch, SetStateAction } from "react";
import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  HiArrowRight,
  HiBookOpen,
  HiBriefcase,
  HiChevronDown,
  HiCode,
  HiDocumentText,
  HiHeart,
  HiLightningBolt,
  HiMail,
  HiMenu,
  HiPencilAlt,
  HiPhone,
  HiTrendingUp,
  HiUsers,
  HiX,
} from "react-icons/hi";
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

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="relative">
        {/* ===== NAVIGATION ===== */}
        <nav className="relative z-50 w-full px-6 py-6 lg:px-12">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <VoiceGeckoLogoText className="w-32" />
            </Link>

            {/* Desktop Navigation & CTA */}
            <div className="hidden items-center gap-8 lg:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium tracking-tight text-neutral-700 hover:text-green-700">
                      Product
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ProductContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium tracking-tight text-neutral-700">
                      Individuals
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <IndividualsContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent font-medium tracking-tight text-neutral-700">
                      About
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <AboutContent />
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="/pricing"
                      className="h-9 px-4 py-2 font-medium tracking-tight text-neutral-700"
                    >
                      Pricing
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <Link
                href="/downloads"
                className={cn(
                  buttonVariants({ variant: "default", size: "xl" }),
                  "bg-primary/80 rounded-lg border-2 !border-black text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02]",
                )}
              >
                Download for Free
              </Link>
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
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ x: "100vw" }}
              animate={{ x: 0 }}
              exit={{ x: "100vw" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-0 left-0 z-50 flex h-screen w-full flex-col bg-white"
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
                  href="/individuals"
                  FoldContent={IndividualsContent}
                  setMenuOpen={setMobileMenuOpen}
                >
                  Individuals
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
                <Link
                  href="/downloads"
                  className="block w-full rounded-lg bg-green-700 px-5 py-2.5 text-center font-medium text-white transition-colors hover:bg-green-600"
                >
                  Download
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* ===== HERO SECTION ===== */}
        <div className="relative min-h-screen">
          {/* Hero Content */}
          <div className="relative z-10 flex items-center justify-center pt-40">
            <div className="space-y-4 px-6 text-center">
              <h1 className="mb-12 text-5xl font-bold tracking-tight md:text-7xl">
                Stop Typing. Start Speaking.
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg leading-tight font-bold tracking-tight md:text-xl">
                Instant voice-to-text transcription that works everywhere.
                <br />
                4x faster than typing, with AI auto-editing.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/downloads"
                  className={cn(
                    buttonVariants({ variant: "default", size: "xl" }),
                    "rounded-lg border-2 !border-black bg-transparent text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02] hover:bg-transparent",
                  )}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  Try VoiceGecko
                </Link>
                <Link
                  href="/downloads"
                  className={cn(
                    buttonVariants({ variant: "default", size: "xl" }),
                    "bg-primary/80 rounded-lg border-2 !border-black text-sm font-semibold tracking-tight transition-all will-change-transform hover:scale-[1.02]",
                  )}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  Download Now
                </Link>
              </div>
              <p className="text-muted-foreground mt-6 text-sm">
                Available on Windows & Mac (coming soon)
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ===== NAVIGATION COMPONENTS =====

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

// ===== FLYOUT CONTENT COMPONENTS =====

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
                See How Voice Gecko Fits Into Your Day
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
                Build fast with voice first processes
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
                Learn the ins and outs of Voice Gecko
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
                    Unblock Teams, Build Faster with Voice
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
                    Take Better Notes, Write Faster, Study Smarter
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/developers"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiCode className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Developers
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Speak More Context, Get Better Results
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
                    Capture Content Ideas Anytime, Anywhere
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/lawyers"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiBriefcase className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Lawyers
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Dictate Case Notes and Memos on the Go
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="space-y-2 sm:pl-3">
          <h3 className="text-muted-foreground/60 mb-1 text-xs font-semibold">
            Case Studies for
          </h3>
          <div className="-mx-2 space-y-1">
            <Link
              href="/case-studies/startup-velocity"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiTrendingUp className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Developer Velocity
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Brain dump your ideas to code faster
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/case-studies/legal-efficiency"
              className="block h-20 rounded-lg p-2 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-full items-start gap-3">
                <HiDocumentText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex flex-col justify-start">
                  <h4 className="mb-0.5 text-sm font-medium text-neutral-900">
                    Manager Velocity
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Dictate your meetings to get more done
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
                    Learn more about our mission and team
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
                    Join the team shaping the future of voice
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
                    Talk to Support
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Reach out to our support team
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
                    Talk to Sales
                  </h4>
                  <p className="text-xs text-neutral-600">
                    Reach out to our enterprise team
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
