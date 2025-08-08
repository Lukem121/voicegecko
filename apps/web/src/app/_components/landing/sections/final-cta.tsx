'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import Link from 'next/link';
import type { DownloadsData } from '~/lib/downloads-utils';
import RiveGeckoPlaceholder from '../components/rive-gecko-placeholder';
import Section from '../components/section';
import WindowsDownloadButton from '../components/windows-download-button';

export default function FinalCtaSection({
  downloadsData,
  downloadError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) {
  return (
    <Section className="rounded-3xl bg-gradient-to-b from-primary/10 via-white to-primary/10 py-20 text-centermd:py-24">
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
    </Section>
  );
}
