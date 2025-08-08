'use client';

import { motion } from 'framer-motion';
import React from 'react';
import Section from '../components/section';

export default function PersonalDictionarySection() {
  const [terms] = React.useState<string[]>([
    'Kubernetes',
    'PostgreSQL',
    'Voice Gecko',
  ]);
  const [animIdx, setAnimIdx] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      setAnimIdx((i) => (i + 1) % terms.length);
    }, 1400);
    return () => clearInterval(id);
  }, [terms.length]);

  return (
    <Section className="p-10 md:p-12 md:py-24">
      <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
        Personal dictionary for domain terms
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm md:text-base">
        Teach Voice Gecko your vocabulary. Keep names, acronyms, and industry
        jargon crystal clear in every transcription.
      </p>

      <div className="relative mt-8 grid gap-6 md:grid-cols-2">
        <motion.div
          className="rounded-2xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
            Domain terms
          </h3>
          <p className="mt-2 text-muted-foreground text-sm">
            Voice Gecko learns your vocabulary. Example terms:
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {terms.map((t) => (
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground text-xs"
                initial={{ scale: 0.95, opacity: 0 }}
                key={t}
                transition={{ duration: 0.2 }}
                viewport={{ once: true }}
                whileInView={{ scale: 1, opacity: 1 }}
              >
                {t}
              </motion.span>
            ))}
          </div>
          <div className="mt-4 text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Add
            company names, product acronyms, or proper nouns.
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
            Before vs After
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="font-semibold text-[12px] text-muted-foreground">
                Before
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                "Spin up kubernetties on postgres sequel with gecko flow."
              </p>
            </div>
            <div className="rounded-lg border border-accent bg-accent p-3">
              <p className="font-semibold text-[12px] text-accent-foreground">
                After
              </p>
              <p className="mt-1 text-[12px] text-accent-foreground">
                "Spin up Kubernetes on PostgreSQL with VoiceGecko."
              </p>
            </div>
          </div>
          <AnimatedSubstitution idx={animIdx} />
        </motion.div>
      </div>
    </Section>
  );
}

function AnimatedSubstitution({ idx }: { idx: number }) {
  const before = ['kubernetties', 'postgres sequel', 'gecko flow'];
  const after = ['Kubernetes', 'PostgreSQL', 'Voice Gecko'];
  return (
    <div className="mt-4 rounded-md border border-border border-dashed bg-background p-2 text-[12px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <motion.code
          animate={{ opacity: [0.6, 1, 0.6] }}
          className="rounded bg-muted px-1 py-0.5 text-[12px]"
          transition={{
            duration: 1.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        >
          {before[idx]}
        </motion.code>
        <span className="text-muted-foreground">→</span>
        <motion.code
          animate={{ opacity: [1, 0.6, 1] }}
          className="rounded bg-accent px-1 py-0.5 text-[12px] text-accent-foreground"
          transition={{
            duration: 1.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        >
          {after[idx]}
        </motion.code>
      </div>
      <div className="mt-2">More substitutions animate as you add terms.</div>
    </div>
  );
}
