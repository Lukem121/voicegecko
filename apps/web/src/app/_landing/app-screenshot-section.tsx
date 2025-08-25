'use client';
import { useIsMobile } from '@acme/ui/hooks/use-mobile';
import { motion } from 'motion/react';
import Image from 'next/image';
import GeckoWithCursorTracking from './gecko-with-cursor-tracking';
import SectionWrapper from './section-wrapper';

export default function AppScreenshotSection() {
  const isMobile = useIsMobile();
  return (
    <SectionWrapper className="">
      <div className="relative mx-auto max-w-4xl">
        {!isMobile && (
          <GeckoWithCursorTracking className="-mb-7 z-10 cursor-pointer self-end justify-self-end" />
        )}
        <motion.div
          animate={{
            background: [
              'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
              'radial-gradient(ellipse 850px 550px at 50% 50%, rgba(124, 228, 93, 0.27), transparent)',
              'radial-gradient(ellipse 750px 650px at 50% 50%, rgba(124, 228, 93, 0.23), transparent)',
              'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
            ],
            rotate: [0, 360],
          }}
          className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
          transition={{
            background: {
              duration: 30,
              ease: 'easeInOut',
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'loop',
            },
            rotate: {
              duration: 60,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'loop',
            },
          }}
        />
        <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-black/5">
          <Image
            alt="VoiceGecko desktop app showing the dictation interface"
            className="h-auto w-full select-none"
            height={1080}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            src="/assets/images/app-screenshots/light-recording.png"
            width={1728}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
