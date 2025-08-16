'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaWindows } from 'react-icons/fa';
import type { DownloadsData } from '~/lib/downloads-utils';
import Section from '../../section';
import WindowsDownloadButton from '../windows-download-button';

export default function HeroSection({
  downloadsData,
  downloadError,
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <Section className="relative w-full max-w-6xl pt-16 pb-16 md:py-24">
      <div className="flex items-center justify-start md:justify-center">
        <motion.div
          animate={{ opacity: 1, y: prefersReducedMotion ? 0 : 0 }}
          className="text-center"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.8,
            ease: 'easeOut',
          }}
        >
          <h1 className="mx-0 mb-4 text-balance font-extrabold font-hero text-4xl leading-[1.1] tracking-tight md:mx-auto md:text-6xl lg:text-7xl">
            Speech‑to‑text that works{' '}
            <span className="text-primary">everywhere</span>
          </h1>
          <p className="mx-0 mb-6 max-w-2xl text-balance font-medium text-base text-muted-foreground leading-relaxed md:mx-auto md:mb-8 md:text-lg">
            Dictating is ~5× faster than typing. Works in any app. Stay in flow
            —no app switching.
          </p>
          <motion.div
            animate={{ opacity: 1, y: prefersReducedMotion ? 0 : 0 }}
            className="mb-8 md:mb-10"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.6,
              ease: 'easeOut',
              delay: prefersReducedMotion ? 0 : 0.3,
            }}
          >
            <WindowsDownloadButton
              downloadError={downloadError}
              downloadsData={downloadsData}
              text="Download for Windows"
            />
          </motion.div>
          <motion.div
            animate={{ opacity: 1 }}
            className="mb-4 flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-xs"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.6,
              ease: 'easeOut',
              delay: prefersReducedMotion ? 0 : 0.5,
            }}
          >
            <span>Loved by 2,000+ users</span>
            <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
            <span>10,000+ hours transcribed</span>
          </motion.div>
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-xs"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.6,
              ease: 'easeOut',
              delay: prefersReducedMotion ? 0 : 0.7,
            }}
          >
            <span className="inline-flex items-center gap-1">
              <FaWindows aria-hidden="true" className="h-3.5 w-3.5" /> Windows
              available now
            </span>
            <span className="rounded-full bg-accent px-2 py-1 font-semibold text-accent-foreground">
              Free plan included
            </span>
            <span className="rounded-full bg-accent px-2 py-1 font-semibold text-accent-foreground">
              No account required
            </span>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
}
