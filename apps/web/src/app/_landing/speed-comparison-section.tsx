'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { FaArrowCircleUp, FaImage, FaRegCopy, FaWindows } from 'react-icons/fa';
import SectionHeader from './section-header';
import SectionWrapper from './section-wrapper';
import GeckoWithTranscriberInBush from './svgs/gecko-with-transcriber-in-bush';
import Vine1Long from './svgs/vine-1-long';

const TYPING_TEXT =
  'Typing takes time. Even at a good pace, words appear slowly on the screen, and the flow of your thoughts is constantly interrupted. Mistakes happen often, forcing you to stop, backspace, and correct them before you can continue. Over the course of an email, a report, or a document, these tiny pauses add up to hours of lost productivity.';

const WORD_SPLIT_REGEX = /\s+/;

interface TypingTextProps {
  text: string;
  wpm: number;
  isVisible: boolean;
  shouldRestart: boolean;
}

function TypingText({ text, wpm, isVisible, shouldRestart }: TypingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    // Only start typing if we should restart or haven't completed yet
    if (!shouldRestart && isCompleted) {
      return;
    }

    setIsTyping(true);
    setDisplayText('');
    setIsCompleted(false);

    // Calculate timing based on actual text
    const words = text.split(WORD_SPLIT_REGEX).length; // Count actual words
    const totalCharacters = text.length;

    // Calculate how long it should take to type all words at the given WPM
    const totalMinutes = words / wpm;
    const totalMilliseconds = totalMinutes * 60 * 1000;

    // Divide by character count to get delay per character
    const baseDelay = totalMilliseconds / totalCharacters;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        setIsCompleted(true);
      }
    }, baseDelay);

    return () => {
      clearInterval(typingInterval);
    };
  }, [text, wpm, isVisible, shouldRestart, isCompleted]);

  return (
    <span className="text-sm leading-6">
      {displayText}
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          className="ml-0.5 inline-block h-4 w-0.5 bg-current"
          transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
        />
      )}
    </span>
  );
}

export default function SpeedComparisonSection() {
  const [isInView, setIsInView] = useState(false);
  const [shouldRestart, setShouldRestart] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          // Only trigger restart if coming back into view
          if (!isInView) {
            setShouldRestart(true);
          }
        } else {
          setIsInView(false);
          // Reset restart flag when out of view
          setShouldRestart(false);
        }
      },
      {
        threshold: 0.3,
      }
    );

    const element = document.getElementById('speed-comparison');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [isInView]);

  // Reset shouldRestart after it's been used
  useEffect(() => {
    if (shouldRestart && isInView) {
      const timer = setTimeout(() => {
        setShouldRestart(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldRestart, isInView]);

  return (
    <SectionWrapper
      className="px-4 pb-36 md:px-6 lg:px-12"
      id="speed-comparison"
    >
      {/* Left Vine */}
      <div
        className="absolute top-4 md:top-8 lg:top-12"
        style={{
          left: 'clamp(-25rem, -20vw, -14rem)',
          transform: 'translateX(-50%)',
        }}
      >
        <Vine1Long
          className="w-auto"
          style={{
            height: 'clamp(14rem, 22vw, 18rem)',
          }}
        />
      </div>

      {/* Right Gecko */}
      <div
        className="lg:-translate-y-1/4 -bottom-12 md:-bottom-8 absolute z-10 lg:top-1/3"
        style={{
          right: 'clamp(-32rem, -25vw, -13rem)',
        }}
      >
        <GeckoWithTranscriberInBush
          className="w-auto"
          style={{
            height: 'clamp(18rem, 30vw, 32rem)',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mb-10">
        <SectionHeader
          cta={
            <a
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'gap-2 px-6 text-white'
              )}
              href="/download/windows"
            >
              <FaWindows aria-hidden className="h-4 w-4" />
              <span>Download for Windows</span>
            </a>
          }
          description="Turn your speech into instant, accurate text, so you skip the typos and keep your flow."
          descriptionWidth="normal"
          eyebrow="Typing Can't Keep Up"
          heading="5x Faster Than Your Keyboard"
          headingSize="lg"
        />
        <div className="mx-auto mt-12 grid max-w-[53rem] gap-8 md:grid-cols-2">
          {/* 40 wpm card */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-[#F6F7F8] p-6 shadow-sm md:p-8"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-hero font-semibold text-3xl tracking-[-0.05em]">
              40 words per minute
            </h3>
            <p className="mt-4 font-semibold leading-5 tracking-[-0.05em]">
              The average typing speed. Slow, and full of interruptions for
              spelling corrections.
            </p>
            <div className="relative mt-5 rounded-xl border bg-white p-4 pb-20 text-foreground/80 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] text-foreground/60">
                <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
                  @
                </span>
                <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
                  <FaRegCopy aria-hidden className="h-3 w-3" />
                  <span>1 Tab</span>
                </span>
              </div>
              <div className="h-[200px] overflow-hidden">
                <TypingText
                  isVisible={isInView}
                  shouldRestart={shouldRestart}
                  text={TYPING_TEXT}
                  wpm={40}
                />
              </div>
              <FaImage
                aria-hidden
                className="absolute right-10 bottom-4 h-3 w-3"
              />
              <FaArrowCircleUp
                aria-hidden
                className="absolute right-4 bottom-4 h-3 w-3"
              />
            </div>
          </motion.div>

          {/* 200 wpm card */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border bg-black p-6 text-white shadow-sm md:p-8"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="font-hero font-semibold text-3xl tracking-[-0.05em]">
              200 words per minute
            </h3>
            <p className="mt-4 font-semibold leading-5 tracking-[-0.05em]">
              The average speaking speed. Fast, fluid, and perfectly
              transcribed.
            </p>
            <div className="relative mt-5 rounded-xl border border-white/10 bg-[#111111] p-4 pb-20 text-white/90 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] text-white/60">
                <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
                  @
                </span>
                <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
                  <FaRegCopy aria-hidden className="h-3 w-3" />
                  <span>1 Tab</span>
                </span>
              </div>
              <div className="h-[200px] overflow-hidden">
                <TypingText
                  isVisible={isInView}
                  shouldRestart={shouldRestart}
                  text={TYPING_TEXT}
                  wpm={200}
                />
              </div>
              <FaImage
                aria-hidden
                className="absolute right-10 bottom-4 h-3 w-3"
              />
              <FaArrowCircleUp
                aria-hidden
                className="absolute right-4 bottom-4 h-3 w-3"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  );
}
