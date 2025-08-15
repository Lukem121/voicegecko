import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { FaWindows } from 'react-icons/fa';
import HeroHeading from './hero-heading';
import HeroSubheading from './hero-subheading';
import SectionWrapper from './section-wrapper';
import Branch1 from './svgs/branch-1';
import Branch2 from './svgs/branch-2';

export default function HeroSection() {
  return (
    <SectionWrapper className="mt-4 py-12">
      {/* Left Branch - Hidden on mobile/tablet, visible on large screens, positioned lower */}
      <div className="-translate-x-1/2 absolute top-1/2 left-0 z-20 hidden translate-y-20 transform lg:block">
        <Branch1 className="h-44 w-auto xl:h-56 2xl:h-72" />
      </div>

      {/* Right Branch - Hidden on mobile/tablet, visible on large screens */}
      <div className="absolute top-1/2 right-0 z-20 hidden translate-x-1/2 translate-y-4 transform lg:block">
        <Branch2 className="h-44 w-auto xl:h-56 2xl:h-72" />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 w-full rounded-3xl bg-[#F9F8F6] p-6 text-center md:p-12 lg:p-16">
        <HeroHeading className="mx-auto mb-[0.3em] max-w-4xl">
          Instant voice transcription at your fingertips — type less, say more.
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
  );
}
