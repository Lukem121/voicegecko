'use client';

import { motion } from 'framer-motion';
import Section from '../components/section';

export default function PerformanceSection() {
  return (
    <Section className="py-24 md:py-24">
      <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
        Talk at 200+ WPM. Around 4× faster than typing.
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm md:text-base">
        Most people type about 40–50 words per minute. Speaking can comfortably
        reach 180–230 WPM. Voice Gecko turns that speed into clean,
        clipboard‑ready text.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <motion.div
          className="rounded-2xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
            Typing vs Speaking
          </h3>
          <div className="mt-4 space-y-4">
            <BarComparison
              accentClass="bg-muted-foreground"
              label="Typing (avg)"
              max={230}
              value={45}
            />
            <BarComparison
              accentClass="bg-primary"
              label="Speaking (you)"
              max={230}
              value={230}
            />
          </div>
          <p className="mt-4 text-muted-foreground text-xs">
            Based on common typing averages and conversational speech rates.
            Your mileage may vary.
          </p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
            Clipboard in ~2 seconds
          </h3>
          <ol className="mt-3 space-y-3 text-muted-foreground text-sm">
            <TimelineItem t="0.0s" text="Listening begins (shortcut)" />
            <TimelineItem t="1.2s" text="Transcription completes" />
            <TimelineItem t="1.8s" text="Clean text copied to clipboard" />
          </ol>
          <p className="mt-4 text-muted-foreground text-xs">
            Example on Windows 11, mid‑range laptop.
          </p>
        </motion.div>
      </div>
    </Section>
  );
}

function BarComparison({
  label,
  value,
  max,
  accentClass,
}: {
  label: string;
  value: number;
  max: number;
  accentClass: string;
}) {
  const widthPercent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground text-sm">{label}</span>
        <span className="text-muted-foreground text-xs">{value} WPM</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted">
        <motion.div
          aria-hidden
          className={`h-2 rounded-full ${accentClass}`}
          initial={{ width: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true }}
          whileInView={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

function TimelineItem({ t, text }: { t: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <motion.span
        aria-hidden
        className="mt-0.5 inline-grid h-6 w-12 place-items-center rounded-full bg-accent font-bold text-[11px] text-accent-foreground"
        initial={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.25 }}
        viewport={{ once: true }}
        whileInView={{ scale: 1, opacity: 1 }}
      >
        {t}
      </motion.span>
      <span className="text-muted-foreground text-sm">{text}</span>
    </li>
  );
}
