'use client';

import { OutcomeCard } from '../components/cards';
import Section from '../components/section';

export default function OutcomesSection() {
  return (
    <Section
      className="py-24md:py-24"
      surface
      surfaceClassName="p-10 md:p-12"
      variant="diagonal"
    >
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
    </Section>
  );
}
