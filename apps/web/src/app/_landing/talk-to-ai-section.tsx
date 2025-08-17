'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import SectionHeader from './section-header';
import SectionWrapper from './section-wrapper';
import Branch2Long from './svgs/branch-2-long';
import Vine3Long from './svgs/vine-3-long';

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
    <SectionWrapper className="max-w-none bg-primary/10 py-16">
      <div className="relative mx-auto max-w-6xl">
        {/* Left Branch */}
        <div
          className="-translate-x-1/2 lg:-translate-y-10 absolute top-4 z-20 md:top-8 lg:top-0"
          style={{
            left: 'clamp(-25rem, -20vw, -18rem)',
          }}
        >
          <Branch2Long
            className="-rotate-[15deg] w-auto scale-x-[-1]"
            style={{
              height: 'clamp(16rem, 24vw, 30rem)',
            }}
          />
        </div>

        {/* Right Vine */}
        <div
          className="-bottom-20 md:-bottom-16 lg:-bottom-20 absolute z-20 lg:translate-y-1/2"
          style={{
            right: 'clamp(-35rem, -30vw, -20rem)',
          }}
        >
          <Vine3Long
            className="w-auto"
            style={{
              height: 'clamp(12rem, 20vw, 20rem)',
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 mx-auto max-w-6xl">
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
              <div
                className="relative flex aspect-square items-center justify-center rounded-3xl p-4 md:p-6"
                style={{
                  maxWidth: 'clamp(18rem, 35vw, 26rem)',
                  margin: '0 auto',
                }}
              >
                <Image
                  alt=""
                  className="absolute inset-0 h-full w-full rounded-3xl object-cover object-left"
                  height={400}
                  src="/assets/images/landing-page/gradient-1.png"
                  width={400}
                />
                <Image
                  alt="Gecko with laptop and microphone for voice input"
                  className="relative z-10 h-auto max-w-[85%] md:max-w-[90%]"
                  height={250}
                  src="/assets/images/geckos/gecko-laptop-w-mic.png"
                  width={250}
                />
              </div>
            </motion.div>

            {/* Features column */}
            <div className="order-1 space-y-8 text-left lg:order-2">
              {features.map((feature, index) => (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-row items-start gap-4 lg:gap-8"
                  initial={{ opacity: 0, x: 20 }}
                  key={feature.title}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Image
                    alt=""
                    className="h-auto w-6 flex-shrink-0"
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
