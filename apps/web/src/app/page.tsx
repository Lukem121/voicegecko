import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import Image from 'next/image';
import { FaWindows } from 'react-icons/fa';
import {
  SiDiscord,
  SiGithub,
  SiJirasoftware,
  SiSlack,
  SiTelegram,
} from 'react-icons/si';
import { TfiMenu } from 'react-icons/tfi';
import { VscCode } from 'react-icons/vsc';
import AIVoiceSection from './_landing/ai-voice-section';
import DownloadButton from './_landing/download-button';
import Eyebrow from './_landing/eyebrow';
import FinalCtaSection from './_landing/final-cta';
import Footer from './_landing/footer';
import GeckoBarSection from './_landing/geckobar-section';
import HeroHeading from './_landing/hero-heading';
import HeroSubheading from './_landing/hero-subheading';
import RiveGeckoPopup from './_landing/rive-gecko-popup';
import SectionWrapper from './_landing/section-wrapper';
import SpeedComparisonSection from './_landing/speed-comparison-section';
import StickyCta from './_landing/sticky-cta';
import Logo from './_landing/svgs/logo';
import TalkToAISection from './_landing/talk-to-ai-section';
import TranscriptionFeaturesSection from './_landing/transcription-features-section';
export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <header>
        <div
          aria-atomic="true"
          aria-live="polite"
          className="hidden items-center justify-center bg-accent px-4 py-5 text-white md:flex"
        >
          <p className="text-center font-medium font-sans text-sm">
            Get more done in less time — Voice to Text can 4x your productivity
            by turning your voice into instant, accurate text.
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

      <main>
        {/* Hero */}
        <SectionWrapper className="mt-4 max-w-[90rem] py-12">
          <div className="w-full rounded-3xl bg-[#F9F8F6] p-6 text-center md:p-12 lg:p-16">
            <HeroHeading className="mx-auto mb-[0.3em] max-w-4xl">
              Instant voice transcription at your fingertips — type less, say
              more.
            </HeroHeading>
            <HeroSubheading className="mx-auto max-w-[60%]">
              Accurate voice-to-text transcription straight to your clipboard,
              saving time and replacing slow typing with fast, natural speech.
            </HeroSubheading>
            <div className="mt-8 flex items-center justify-center">
              <a
                className={cn(
                  buttonVariants({ variant: 'default', size: 'xl' }),
                  'gap-2 px-6 text-white'
                )}
                href="/download/windows"
              >
                <FaWindows aria-hidden className="h-4 w-4" />
                <span>Download for Windows</span>
              </a>
            </div>
          </div>
        </SectionWrapper>

        {/* Social proof and integrations */}
        <SectionWrapper className="max-w-7xl">
          <div className="mt-10 text-center text-muted-foreground text-xs md:text-sm">
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>Loved by 2,000+ users</span>
              <span
                aria-hidden
                className="hidden h-1.5 w-1.5 rounded-full bg-gray-300 md:inline-block"
              />
              <span>10,000+ hours transcribed</span>
            </p>
            <Eyebrow className="mt-2">
              WORKS ACROSS VIRTUALLY ANY DESKTOP APP
            </Eyebrow>
          </div>
          <ul className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-foreground/80 md:gap-x-8">
            <li className="inline-flex items-center gap-2 text-sm">
              <SiSlack aria-hidden className="h-4 w-4" />
              <span>Slack</span>
            </li>
            <li className="inline-flex items-center gap-2 text-sm">
              <SiJirasoftware aria-hidden className="h-4 w-4" />
              <span>Jira</span>
            </li>
            <li className="inline-flex items-center gap-2 text-sm">
              <SiDiscord aria-hidden className="h-4 w-4" />
              <span>Discord</span>
            </li>
            <li className="inline-flex items-center gap-2 text-sm">
              <SiGithub aria-hidden className="h-4 w-4" />
              <span>GitHub</span>
            </li>
            <li className="inline-flex items-center gap-2 text-sm">
              <VscCode aria-hidden className="h-4 w-4" />
              <span>VS Code</span>
            </li>
            <li className="inline-flex items-center gap-2 text-sm">
              <SiTelegram aria-hidden className="h-4 w-4" />
              <span>Telegram</span>
            </li>
          </ul>
        </SectionWrapper>

        {/* App screenshot */}
        <SectionWrapper className="mx-auto max-w-7xl px-4 pt-8 pb-20 md:px-6 lg:px-12">
          <div className="relative mx-auto max-w-4xl">
            <div className="-inset-x-24 -top-8 pointer-events-none absolute bottom-[-3rem] rounded-[2rem] bg-gradient-to-b from-primary/20 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-black/5">
              <Image
                alt="VoiceGecko desktop app showing the transcription interface"
                className="h-auto w-full select-none"
                height={1080}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                src="/assets/images/app-screenshots/light-recording.png"
                width={1728}
              />
            </div>
          </div>
        </SectionWrapper>

        {/* Speed section */}
        <SpeedComparisonSection />

        {/* GeckoBar section */}
        <GeckoBarSection />

        {/* AI + Voice */}
        <AIVoiceSection />

        {/* Talk to AI */}
        <TalkToAISection />

        {/* Transcription Features */}
        <TranscriptionFeaturesSection />

        {/* Final CTA */}
        <FinalCtaSection />

        <Footer />

        <StickyCta />

        <RiveGeckoPopup className="mt-[-4rem]" />
      </main>
    </div>
  );
}
