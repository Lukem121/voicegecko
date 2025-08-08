'use client';

import { motion } from 'framer-motion';
import type React from 'react';
import { FaHeadphones } from 'react-icons/fa';
import { HiBriefcase, HiMicrophone } from 'react-icons/hi';
import { TbBrain } from 'react-icons/tb';
import Section from '../components/section';

type Persona = {
  title: string;
  points: string[];
  Icon: React.ComponentType<{ className?: string }>;
};

const personas: Persona[] = [
  {
    title: 'Typing challenges',
    Icon: HiMicrophone,
    points: [
      'Reduce strain with voice‑first drafting',
      'Stay in flow without switching contexts',
      'Clipboard‑ready text in seconds',
    ],
  },
  {
    title: 'Customer support',
    Icon: FaHeadphones,
    points: [
      'Recap calls into clear bullet points',
      'Paste summaries into tickets or CRM',
      'Keep SLAs moving',
    ],
  },
  {
    title: 'Consultants & sales',
    Icon: HiBriefcase,
    points: [
      'Draft follow‑ups on the go',
      'Capture next steps before context fades',
      'Share notes instantly',
    ],
  },
  {
    title: 'Dyslexic thinkers',
    Icon: TbBrain,
    points: [
      'Talk through ideas at natural speed',
      'Turn thoughts into structured bullets',
      'Focus on content, not typing',
    ],
  },
];

export default function PersonasSection() {
  return (
    <Section className="bg-primary/10 p-8 md:p-10md:py-24">
      <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
        Built to help different kinds of work
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm">
        Whether you type less comfortably or talk to customers all day, Voice
        Gecko speeds up how you capture and share information.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        {personas.map((p, i) => (
          <motion.div
            className="group hover:-translate-y-0.5 rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl"
            initial={{ opacity: 0, y: 8 }}
            key={p.title}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-card-foreground tracking-tight">
                {p.title}
              </h3>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-base">
                <p.Icon className="h-4 w-4" />
              </span>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground text-sm">
              {p.points.map((pt, idx) => (
                <li key={`${p.title}-${idx}`}>{pt}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
