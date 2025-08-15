'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import SectionWrapper from './section-wrapper';

export default function TranscriptionFeaturesSection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-12">
        <div className="text-left">
          <p className="font-medium text-primary text-sm">
            Full Control, Every Time
          </p>
          <h2 className="mt-2 font-hero font-semibold text-2xl tracking-[-0.05em]">
            Transcription That Works Your Way
          </h2>
          <p className="mt-2 max-w-lg text-pretty text-muted-foreground text-sm">
            From saved transcripts to a custom dictionary and personalized
            shortcuts, Voice Gecko adapts to you — delivering accurate text
            exactly how and where you need it.
          </p>
          <div className="mt-6">
            <a
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'gap-2 px-6 text-white'
              )}
              href="/download/windows"
            >
              <span>Start transcribing for free</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 lg:grid-cols-2">
          {/* Top Left: Never Lose Work */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[400px] overflow-hidden rounded-xl bg-primary p-4 text-white md:min-h-[500px] md:p-6"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="mb-6 overflow-hidden rounded-xl">
              <div className="aspect-[16/10]">
                <Image
                  alt="VoiceGecko transcription history interface"
                  className="h-full w-full object-cover object-top"
                  height={400}
                  src="/assets/images/app-screenshots/light-transcriptions.png"
                  width={600}
                />
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-medium text-white/80 text-xs uppercase tracking-wide">
                NEVER LOSE WORK
              </p>
              <h3 className="mt-2 font-hero font-semibold text-2xl tracking-[-0.05em]">
                Never Lose Work
              </h3>
              <p className="mt-2 text-sm text-white/90 leading-relaxed">
                Every transcription you make is saved in a searchable history
                for easy review, copying, or reuse anytime. Your raw audio is
                never stored — only the finished text stays in your account.
              </p>
            </div>
          </motion.div>

          {/* Top Right: Teach It Your Vocabulary */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[400px] overflow-hidden rounded-xl bg-accent p-4 text-white md:min-h-[500px] md:p-6"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="mb-6 overflow-hidden rounded-xl">
              <div className="aspect-[16/10] bg-gray-500 p-4">
                <Image
                  alt="VoiceGecko custom dictionary interface"
                  className="h-full w-full object-contain"
                  height={400}
                  src="/assets/images/app-screenshots/light-dictionary-add-modal.png"
                  width={600}
                />
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-medium text-white/80 text-xs uppercase tracking-wide">
                PERFECT EVERY TIME
              </p>
              <h3 className="mt-2 font-hero font-semibold text-2xl tracking-[-0.05em]">
                Teach It Your Vocabulary
              </h3>
              <p className="mt-2 text-sm text-white/90 leading-relaxed">
                Add your own words, names, or industry jargon so they're always
                transcribed correctly — from SQL to product names. Fine-tune it
                once and enjoy perfect results forever.
              </p>
            </div>
          </motion.div>

          {/* Bottom Left: Your Shortcuts, Your Rules */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[400px] overflow-hidden rounded-xl bg-accent-secondary p-4 text-white md:min-h-[500px] md:p-6"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="mb-6 overflow-hidden rounded-xl">
              <div className="aspect-[16/10]">
                <Image
                  alt="VoiceGecko keyboard shortcuts settings"
                  className="h-full w-full object-cover object-top"
                  height={400}
                  src="/assets/images/app-screenshots/shortcuts-recording.png"
                  width={600}
                />
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-medium text-white/80 text-xs uppercase tracking-wide">
                WORKS YOUR WAY
              </p>
              <h3 className="mt-2 font-hero font-semibold text-2xl tracking-[-0.05em]">
                Your Shortcuts, Your Rules
              </h3>
              <p className="mt-2 text-sm text-white/90 leading-relaxed">
                Set custom keyboard shortcuts to start and stop transcriptions
                without breaking your flow. Whether you work in code, documents,
                or design tools, it's always at your fingertips.
              </p>
            </div>
          </motion.div>

          {/* Bottom Right: Testimonial */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[400px] overflow-hidden rounded-xl border bg-[#F9F8F6] p-4 md:min-h-[500px] md:p-6"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex h-full flex-col">
              {/* Testimonial quote - Top */}
              <div className="relative z-10 flex-1">
                <blockquote className="font-semibold text-gray-900 text-sm leading-relaxed">
                  "Voice Gecko has significantly improved my development
                  workflow. I've always been a slow typist and bad at spelling.
                  Being able to just say what I want and have it instantly
                  transcribed, ready to use in my projects or pass to ChatGPT
                  has made it an essential tool in my workflow."
                </blockquote>
                <div className="mt-4">
                  <div className="font-semibold text-gray-900">John Holton</div>
                  <div className="text-gray-600 text-xs">
                    Director at Click Master Web Studio
                  </div>
                </div>
              </div>

              {/* Stats and descriptions - Bottom */}
              <div className="mt-6 space-y-3 md:mt-auto">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex min-w-20 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-3 py-2 font-bold text-sm text-white">
                    4h/week
                  </div>
                  <p className="text-gray-600 text-xs">
                    More time for deep work instead of staring at a blinking
                    cursor.
                  </p>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex min-w-20 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-3 py-2 font-bold text-sm text-white">
                    146 WPM
                  </div>
                  <p className="text-gray-600 text-xs">
                    Natural speech turned into accurate text — over 3× faster
                    than typing.
                  </p>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex min-w-20 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-3 py-2 font-bold text-sm text-white">
                    10K+
                  </div>
                  <p className="text-gray-600 text-xs">
                    Words processed across transcripts, all captured without
                    manual typing.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  );
}
