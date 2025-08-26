'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@acme/ui/components/ui/accordion';
import Section from '../../section';

export default function FaqSection() {
  return (
    <Section className="p-8 md:p-10 md:py-24">
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
              Windows is available now. macOS is on the roadmap and coming next.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="speed">
            <AccordionTrigger className="font-semibold text-foreground text-sm">
              How fast is dictation?
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
              Not yet. Today we focus on fast, reliable English dictation.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="audio">
            <AccordionTrigger className="font-semibold text-foreground text-sm">
              What happens with my audio?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm">
              We focus on fast clipboard delivery. We don’t retain audio beyond
              processing, and transcripts stay on your device. See our Privacy
              Policy for details.
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
        </Accordion>
      </div>
    </Section>
  );
}
