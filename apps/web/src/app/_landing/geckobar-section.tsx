'use client';
import { cn } from '@acme/ui/lib/utils';
import type {
  Event,
  EventCallback,
  RiveEventPayload,
} from '@rive-app/canvas-lite';
import {
  Alignment,
  EventType,
  Fit,
  Layout,
  useRive,
} from '@rive-app/react-canvas-lite';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import SectionHeader from './section-header';
import SectionWrapper from './section-wrapper';

type TimelineStep = 'none' | 'start' | 'stop' | 'use';

export default function GeckoBarSection() {
  const [currentStep, setCurrentStep] = useState<TimelineStep>('none');

  const { RiveComponent, rive } = useRive({
    src: '/assets/images/geckos/rive/geckobar-demo.riv',
    autoplay: true,
    stateMachines: 'State Machine 1',
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  const onRiveEventReceived: EventCallback = (_event: Event) => {
    const event = _event.data as RiveEventPayload;
    const eventName = event.name;

    switch (eventName) {
      case 'start-recording':
        setCurrentStep('start');
        break;
      case 'stop-recording':
        setCurrentStep('stop');
        break;
      case 'completed':
        setCurrentStep('use');
        break;
      case 'tooltip-open':
        // Reset to none or handle as needed
        setCurrentStep('start');
        break;
      case 'end-of-sequence':
        // Reset to none or handle as needed
        setCurrentStep('start');
        break;
      default:
        // Handle any other events or unknown events
        break;
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: rive is a dependency of the RiveComponent
  useEffect(() => {
    if (rive) {
      rive.on(EventType.RiveEvent, onRiveEventReceived);
    }
  }, [rive]);

  const isStepActive = (step: TimelineStep) => currentStep === step;

  return (
    <SectionWrapper className="max-w-none bg-[#00A9A5]/10 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-12">
        <SectionHeader
          description="A persistent, interactive bar that lets you trigger transcription or see exactly what's happening."
          descriptionWidth="wide"
          eyebrow="Always Within Reach"
          heading="Meet the GeckoBar"
          headingSize="xl"
        />

        <div
          className={cn(
            'mx-auto mt-16 grid max-w-4xl items-center gap-16 md:grid-cols-2 md:gap-32'
          )}
        >
          {/* Steps */}
          <div className="space-y-10">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div
                aria-hidden
                className={`h-24 w-0.5 transition-colors duration-300 ease-in-out ${
                  isStepActive('start') ? 'bg-primary' : 'bg-foreground/20'
                }`}
              />
              <motion.div
                animate={{
                  scale: isStepActive('start') ? 1.02 : 1,
                }}
                className="flex-1"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <h3
                  className={`font-semibold text-base transition-colors duration-300 ease-in-out ${
                    isStepActive('start')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  Start Recording
                </h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Click the GeckoBar or use your shortcut to begin capturing
                  your speech.
                </p>
              </motion.div>
            </motion.div>
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                aria-hidden
                className={`h-24 w-0.5 transition-colors duration-300 ease-in-out ${
                  isStepActive('stop') ? 'bg-primary' : 'bg-foreground/20'
                }`}
              />
              <motion.div
                animate={{
                  scale: isStepActive('stop') ? 1.02 : 1,
                }}
                className="flex-1"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <h3
                  className={`font-semibold text-base transition-colors duration-300 ease-in-out ${
                    isStepActive('stop')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  Stop and Process
                </h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Finish speaking, click stop, and watch it process in seconds.
                </p>
              </motion.div>
            </motion.div>
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div
                aria-hidden
                className={`h-24 w-0.5 transition-colors duration-300 ease-in-out ${
                  isStepActive('use') ? 'bg-primary' : 'bg-foreground/20'
                }`}
              />
              <motion.div
                animate={{
                  scale: isStepActive('use') ? 1.02 : 1,
                }}
                className="flex-1"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <h3
                  className={`font-semibold text-base transition-colors duration-300 ease-in-out ${
                    isStepActive('use')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  Use Your Text
                </h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Your transcription is ready on your clipboard or instantly
                  pasted where you're working.
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Preview panel */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
          >
            <div className="aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-[#2E2E2E] p-8">
              <RiveComponent className="h-full w-full" />
            </div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  );
}
