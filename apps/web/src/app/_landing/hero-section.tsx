'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { FaWindows } from 'react-icons/fa';
import { usePostHog } from '~/hooks/use-posthog';
// import { APP_ROUTES } from '~/utils/app-routes';
import { useStartDownload } from '~/hooks/use-start-download';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import HeroHeading from './hero-heading';
import HeroSubheading from './hero-subheading';
import SectionWrapper from './section-wrapper';
import Branch1Long from './svgs/branch-1-long';
import Branch2Long from './svgs/branch-2-long';

export default function HeroSection() {
  const { trackEvent } = usePostHog();
  const { startDownload } = useStartDownload();

  const handleHeroCTAClick = () => {
    trackEvent({
      event: 'hero_cta_clicked',
      cta_text: 'Download for Windows',
      cta_location: 'hero',
      source: POSTHOG_SOURCES.LANDING_PAGE,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <SectionWrapper className="mt-4 py-0">
      {/* Left Branch - positioned lower */}
      <div
        className="md:-bottom-60 lg:-bottom-80 -rotate-[15deg] absolute bottom-0 z-20 translate-y-10 md:rotate-0"
        style={{
          left: 'clamp(-50rem, -35vw, -24rem)',
        }}
      >
        <Branch1Long
          className="w-auto"
          style={{
            height: 'clamp(20rem, 32vw, 32rem)',
          }}
        />
      </div>

      {/* Right Branch - positioned higher */}
      <div
        className="md:-bottom-32 lg:-bottom-32 absolute bottom-10 z-20 translate-y-10 rotate-[25deg] md:rotate-3"
        style={{
          right: 'clamp(-50rem, -35vw, -24rem)',
        }}
      >
        <Branch2Long
          className="w-auto"
          style={{
            height: 'clamp(18rem, 30vw, 28rem)',
          }}
        />
      </div>
      {/* Main Hero Content */}
      <div className="relative z-10 w-full rounded-3xl bg-[#F9F8F6] p-6 text-center md:p-12 lg:p-16 dark:bg-zinc-900">
        <HeroHeading className="z-30 mx-auto mb-[0.3em] max-w-4xl">
          Instant voice dictation at your fingertips — type less, say more.
        </HeroHeading>
        <HeroSubheading className="z-30 mx-auto max-w-[60%]">
          Accurate voice-to-text dictation straight to your clipboard, saving
          time and replacing slow typing with fast, natural speech.
        </HeroSubheading>
        <div className="z-30 mt-8 flex items-center justify-center">
          <button
            className={cn(
              buttonVariants({ variant: 'default', size: 'xl' }),
              'gap-2 px-6 text-white'
            )}
            onClick={() => {
              handleHeroCTAClick();
              startDownload({ source: 'landing_page' });
              // Success page no longer needs query params
            }}
            type="button"
          >
            <FaWindows aria-hidden className="h-4 w-4" />
            <span>Download for Windows</span>
          </button>
        </div>
      </div>
    </SectionWrapper>
  );
}
