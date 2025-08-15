'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import SectionHeader from './section-header';
import SectionWrapper from './section-wrapper';

const features = [
  {
    icon: '/assets/images/icons/blueprint.png',
    title: 'Full Specs, Fast',
    description:
      'Describe features, edge cases, and architecture out loud — nothing gets left out.',
  },
  {
    icon: '/assets/images/icons/puzzle.png',
    title: 'No More Corner-Cutting',
    description:
      'Stop skipping important details just because typing them all takes too long.',
  },
  {
    icon: '/assets/images/icons/code.png',
    title: 'Better Output, Less Rework',
    description:
      'Give your AI everything it needs upfront and spend less time fixing half-baked results.',
  },
  {
    icon: '/assets/images/icons/monitor.png',
    title: 'Fewer Context Switches',
    description:
      'Speak instructions without leaving your editor — no alt-tab marathon to type long directions.',
  },
];

export default function AIVoiceSection() {
  return (
    <SectionWrapper className="">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-12">
        <SectionHeader
          description="Great code needs clear direction. Writing detailed plans is slow and exhausting — with Voice Gecko, you can speak your full vision in minutes."
          descriptionWidth="wide"
          eyebrow="For Modern Developers"
          heading="AI + Voice is the New Way to Build"
          headingSize="xl"
        />

        <div className="relative mx-auto mt-16 grid max-w-4xl items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Features column */}
          <div className="space-y-8 text-center lg:text-left">
            {features.map((feature, index) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8"
                initial={{ opacity: 0, x: -20 }}
                key={feature.title}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Image
                  alt=""
                  className="h-8 w-auto"
                  height={32}
                  src={feature.icon}
                  width={32}
                />
                <div className="max-w-xs">
                  <h3 className="font-semibold text-lg tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visual column */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Main interface mockup */}
            <div
              className="relative flex flex-col overflow-hidden rounded-2xl border bg-[#141414] px-3 pt-4 pb-16 shadow-2xl"
              style={{
                maxWidth: 'clamp(22rem, 45vw, 32rem)',
                margin: '0 auto',
              }}
            >
              <Image
                alt="Voice Gecko chat interface showing AI conversation for development tasks"
                className="mx-auto h-auto w-full"
                height={600}
                src="/assets/images/landing-page/cursor-ide.png"
                width={800}
              />
            </div>

            {/* Gecko mascot */}
            <div
              className="absolute bottom-0"
              style={{
                right: 'clamp(-8rem, -15vw, -4rem)',
              }}
            >
              <Image
                alt=""
                className="w-auto scale-x-[-1]"
                height={908}
                src="/assets/images/geckos/gecko-worker.png"
                style={{
                  height: 'clamp(8rem, 12vw, 10rem)',
                }}
                width={779}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  );
}
