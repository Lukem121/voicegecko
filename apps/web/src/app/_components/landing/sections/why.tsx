'use client';

import { useIsMobile } from '@acme/ui/hooks/use-mobile';
import { WhyCard } from '../components/cards';
import Section from '../components/section';
import GeckoWithCursorTracking from '../gecko-with-cursor-tracking';

export default function WhySection() {
  const isMobile = useIsMobile();
  return (
    <Section className="py-20md:py-24">
      <h2 className="text-left font-bold text-2xl text-foreground tracking-tight md:text-center md:text-3xl">
        Why Voice Gecko?
      </h2>
      <p className="mx-0 mt-2 max-w-2xl text-left text-muted-foreground text-sm md:mx-auto md:text-center">
        Built to remove real blockers: stop cleanup, skip context switching, and
        move ~4× faster than typing.
      </p>
      <div className="md:-ml-12 mt-8 grid gap-6 md:grid-cols-4">
        {!isMobile && (
          <GeckoWithCursorTracking className="-mb-3 cursor-pointer self-end justify-self-end" />
        )}
        <WhyCard
          body="Start with a shortcut; your words land on your clipboard or type in place so you stay in flow."
          tag="Flow"
          title="No app‑switching"
        />
        <WhyCard
          body="Personal dictionary learns names, acronyms, and product terms so transcripts read correctly the first time."
          tag="Accuracy"
          title="Gets jargon right"
        />
        <WhyCard
          body="Most people type ~40–50 WPM. Speaking reaches 180–230 WPM—get clipboard‑ready text in seconds."
          tag="Speed"
          title="4× faster than typing"
        />
      </div>
    </Section>
  );
}
