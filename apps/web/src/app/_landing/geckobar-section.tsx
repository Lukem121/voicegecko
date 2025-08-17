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
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import SectionHeader from './section-header';
import SectionWrapper from './section-wrapper';
import Vine2Long from './svgs/vine-2-long';

type TimelineStep = 'none' | 'start' | 'stop' | 'use';

const steps = [
  {
    id: 'start',
    title: 'Start Recording',
    description:
      'Click the GeckoBar or use your shortcut to begin capturing your speech.',
  },
  {
    id: 'stop',
    title: 'Stop and Process',
    description:
      'Finish speaking, click stop, and watch it process in seconds.',
  },
  {
    id: 'use',
    title: 'Use Your Text',
    description:
      "Your transcription is ready on your clipboard or instantly pasted where you're working.",
  },
];

export default function GeckoBarSection() {
  const [currentStep, setCurrentStep] = useState<TimelineStep>('start');

  const { RiveComponent, rive } = useRive({
    src: '/assets/images/geckos/rive/geckobar-demo.riv',
    autoplay: true,
    stateMachines: 'State Machine 1',
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  const { RiveComponent: BugOnBranchComponent } = useRive({
    src: '/assets/images/geckos/rive/bug_on_branch.riv',
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

  const getCurrentStepData = () => {
    return steps.find((step) => step.id === currentStep);
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  return (
    <SectionWrapper className="max-w-none bg-[#00A9A5]/10 py-16">
      <div className="relative mx-auto max-w-6xl">
        {/* Left Bug on Branch */}
        <div className="-translate-y-20 -translate-x-1/2 absolute top-0 left-[-25rem] z-20 hidden lg:block">
          <div className="h-60 w-[18rem] xl:h-72 xl:w-[22rem] 2xl:h-80 2xl:w-[45rem]">
            <BugOnBranchComponent className="h-full w-full" />
          </div>
        </div>

        {/* Right Vine with Flower */}
        <div
          className="-bottom-32 md:-bottom-24 absolute z-20 translate-x-0 md:translate-x-1/2 lg:bottom-0 lg:translate-y-2/3"
          style={{
            right: 'clamp(-25rem, -25vw, -12rem)',
          }}
        >
          <Vine2Long
            className="w-auto"
            style={{
              height: 'clamp(6rem, 18vw, 16rem)',
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeader
            description="A persistent, interactive bar that lets you trigger transcription or see exactly what's happening."
            descriptionWidth="wide"
            eyebrow="Always Within Reach"
            heading="Meet the GeckoBar"
            headingSize="xl"
          />

          <div
            className={cn(
              'mx-auto mt-8 grid max-w-4xl items-center gap-8 md:mt-16 md:grid-cols-2 md:gap-24 lg:gap-32'
            )}
          >
            {/* Mobile Steps - Single rotating step */}
            <div className="flex items-center gap-4 md:hidden">
              {/* Progress indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className="h-16 w-0.5 bg-primary" />
                <div className="w-6 text-center font-medium text-primary text-xs">
                  {getCurrentStepIndex() + 1}/3
                </div>
              </div>

              {/* Animated step content */}
              <div className="relative flex min-h-[120px] flex-1 items-center">
                <AnimatePresence mode="wait">
                  {getCurrentStepData() && (
                    <motion.div
                      animate={{
                        opacity: 1,
                      }}
                      className="w-full"
                      exit={{
                        opacity: 0,
                      }}
                      initial={{
                        opacity: 0,
                      }}
                      key={currentStep}
                      transition={{
                        duration: 0.3,
                        ease: 'easeInOut',
                      }}
                    >
                      <h3 className="font-semibold text-primary text-sm">
                        {getCurrentStepData()?.title}
                      </h3>
                      <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                        {getCurrentStepData()?.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Desktop Steps - Original multi-step layout */}
            <div className="hidden space-y-10 md:block">
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
                    Finish speaking, click stop, and watch it process in
                    seconds.
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
              <div className="aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-[#2E2E2E] p-4 md:aspect-square md:rounded-3xl md:p-8">
                <RiveComponent className="h-full w-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
