'use client';

import { motion } from 'framer-motion';
import { HiLightningBolt, HiMicrophone } from 'react-icons/hi';
import { TbSparkles } from 'react-icons/tb';
import { HowItWorksItem } from '../components/cards';
import Section from '../components/section';
import ShortcutPlayground from '../widgets/shortcut-playground';

export default function HowItWorksSection() {
  return (
    <Section surface surfaceClassName="p-10 md:p-12md:py-24" variant="plain">
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
          className="rounded-2xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
            Three steps to your first transcription
          </h3>
          <ol className="mt-3 space-y-3 text-muted-foreground text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
                1
              </span>
              Download and install for Windows.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
                2
              </span>
              Grant microphone permission.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
                3
              </span>
              Press the shortcut and speak—your text is clipboard‑ready.
            </li>
          </ol>
          <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-muted-foreground text-xs">
            MVP: fast, reliable English transcription.
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="font-semibold text-[12px] text-muted-foreground">
                Your Voice
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                "Draft a recap for our sprint review, note blockers, and assign
                owners."
              </p>
            </div>
            <div className="rounded-lg border border-accent bg-accent p-3">
              <p className="font-semibold text-[12px] text-accent-foreground">
                Clipboard Output
              </p>
              <ul className="mt-1 list-disc pl-4 text-[12px] text-accent-foreground">
                <li>Summary of sprint</li>
                <li>Blockers highlighted</li>
                <li>Owners assigned with next steps</li>
              </ul>
            </div>
          </div>
        </motion.div>
        <ShortcutPlayground />
      </div>
    </Section>
  );
}
