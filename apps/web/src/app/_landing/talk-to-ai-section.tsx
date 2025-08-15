'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import SectionHeader from './section-header';
import SectionWrapper from './section-wrapper';
import Branch2 from './svgs/branch-2';
import Vine1 from './svgs/vine-1';

const features = [
  {
    icon: '/assets/images/icons/speach.png',
    title: 'Natural language input',
    description: 'No need to overthink your wording, just speak your thoughts.',
  },
  {
    icon: '/assets/images/icons/document.png',
    title: 'Richer prompts, better results',
    description:
      'Give your AI full context in seconds for more accurate, useful responses.',
  },
  {
    icon: '/assets/images/icons/flow.png',
    title: 'Stay in Flow',
    description: 'Keep ideas moving without stopping to type or fix typos.',
  },
  {
    icon: '/assets/images/icons/document.png',
    title: 'Zero Typos, Perfect Spelling',
    description:
      'Your ideas, instantly transcribed with flawless accuracy every time.',
  },
];

export default function TalkToAISection() {
  return (
    <SectionWrapper className="max-w-none bg-primary/10 py-20">
      <div className="relative mx-auto max-w-6xl">
        {/* Left Bush - Hidden on mobile/tablet, visible on large screens, positioned high */}
        <div className="-left-32 -top-32 -translate-x-3/5 absolute z-20 hidden translate-y-8 transform lg:block">
          <Branch2 className="-scale-x-100 -rotate-[30deg] h-44 w-[14rem] xl:h-52 xl:w-[16rem] 2xl:h-64 2xl:w-[28rem]" />
        </div>

        {/* Right Vine - Hidden on mobile/tablet, visible on large screens, positioned low */}
        <div className="-right-32 -bottom-32 absolute z-20 hidden translate-x-3/5 translate-y-1/3 transform lg:block">
          <Vine1 className="-scale-x-100 h-32 w-auto rotate-90 xl:h-40 2xl:h-72" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 lg:px-12">
          <SectionHeader
            description="Skip the tedious prompt typing. Speak naturally, capture every thought instantly, and send it straight to your large language model."
            descriptionWidth="wide"
            eyebrow="Stop Typing to Your AI"
            heading="Talk to AI the Way You Think"
            headingSize="xl"
          />

          <div className="relative mx-auto mt-8 grid max-w-4xl items-center gap-8 md:mt-16 md:gap-16 lg:grid-cols-2 lg:gap-24">
            {/* Visual column */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="relative order-2 lg:order-1"
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Gradient background */}
              <div className="relative flex aspect-[4/3] items-center justify-center rounded-3xl p-6 md:aspect-square md:p-8">
                <Image
                  alt=""
                  className="absolute inset-0 h-full w-full rounded-3xl object-cover object-left"
                  height={400}
                  src="/assets/images/landing-page/gradient-1.png"
                  width={400}
                />
                <Image
                  alt="Gecko with laptop and microphone for voice input"
                  className="relative z-10 h-auto max-w-[70%] md:max-w-full"
                  height={250}
                  src="/assets/images/geckos/gecko-laptop-w-mic.png"
                  width={250}
                />
              </div>
            </motion.div>

            {/* Features column */}
            <div className="order-1 space-y-8 lg:order-2">
              {features.map((feature, index) => (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-8"
                  initial={{ opacity: 0, x: 20 }}
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
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
