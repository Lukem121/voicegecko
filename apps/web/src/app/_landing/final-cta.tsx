'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import Image from 'next/image';
import { FaWindows } from 'react-icons/fa';
import SectionWrapper from './section-wrapper';
import Logo from './svgs/logo';

export default function FinalCtaSection() {
  return (
    <SectionWrapper className="max-w-5xl">
      <div className="relative overflow-hidden rounded-3xl bg-black px-4 pt-12 md:px-6 md:pb-20 lg:px-12">
        {/* Right side gradient overlay - desktop only */}
        <div className="absolute top-0 right-0 z-20 hidden h-full w-24 bg-gradient-to-l from-primary/30 to-transparent lg:block" />

        {/* Radial gradient behind image - responsive positioning */}
        <div
          className="-bottom-32 -translate-x-1/2 lg:-right-56 lg:-top-36 absolute left-1/2 h-[600px] w-[600px] rounded-full opacity-90 lg:left-auto lg:h-[800px] lg:w-[800px] lg:translate-x-0"
          style={{
            background:
              'radial-gradient(circle, rgba(124, 228, 93, 0.8) 0%, rgba(124, 228, 93, 0.6) 15%, rgba(124, 228, 93, 0.4) 30%, rgba(124, 228, 93, 0.2) 50%, rgba(124, 228, 93, 0.1) 70%, transparent 100%)',
            filter: 'blur(40px)',
            zIndex: 0,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col lg:block">
          {/* Content Section */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="text-white lg:max-w-lg"
            initial={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <Logo className="h-11" variant="dark" />

            {/* Heading */}
            <h2 className="mt-2 font-bold font-hero text-4xl leading-tight tracking-tight">
              Work at the Speed
              <br />
              of Thought
            </h2>

            {/* Description */}
            <p className="mt-2 max-w-sm text-white lg:max-w-sm">
              Stop letting the keyboard slow you down. Capture ideas instantly,
              keep your flow, and get more done with Voice Gecko.
            </p>

            {/* CTA Button */}
            <div className="mt-8">
              <a
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'gap-2 bg-primary px-6 py-3 text-white'
                )}
                href="/download/windows"
              >
                <FaWindows aria-hidden className="h-4 w-4" />
                <span>Download for Windows</span>
              </a>
            </div>
          </motion.div>

          {/* App Screenshot - Mobile positioning */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="-mx-4 md:-mx-6 relative mt-12 flex justify-end lg:hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="rounded-tl-3xl bg-[#FFFFFF]/37 pt-3 pl-3 backdrop-blur-sm">
              <div className="rounded-tl-3xl bg-[#5F5F5F]/30 pt-2.5 pl-2.5 backdrop-blur-sm">
                <div className="h-64 w-64 overflow-hidden rounded-tl-2xl md:h-80 md:w-80">
                  <Image
                    alt="VoiceGecko productivity interface showing task organization and collaboration features"
                    className="h-full w-full object-cover object-top-left"
                    height={600}
                    src="/assets/images/app-screenshots/light-recording.png"
                    width={800}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* App Screenshot - Desktop positioning (relative to main wrapper) */}
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="-bottom-16 absolute right-0 z-10 hidden lg:block"
          initial={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="rounded-tl-3xl bg-[#FFFFFF]/37 pt-3 pl-3 backdrop-blur-sm">
            <div className="rounded-tl-3xl bg-[#5F5F5F]/30 pt-2.5 pl-2.5 backdrop-blur-sm">
              <div className="h-96 w-96 overflow-hidden rounded-tl-2xl">
                <Image
                  alt="VoiceGecko productivity interface showing task organization and collaboration features"
                  className="h-full w-full object-cover object-top-left"
                  height={600}
                  src="/assets/images/app-screenshots/light-recording.png"
                  width={800}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
