import { log } from '@acme/observability/log';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@acme/ui/components/stepper-vertical';

import { Badge } from '@acme/ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Textarea } from '@acme/ui/components/ui/textarea';
import { createFileRoute } from '@tanstack/react-router';
import { listen } from '@tauri-apps/api/event';
import {
  AudioLines,
  CheckCircle,
  Clipboard,
  KeyRound,
  Mic,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '~/components/onboarding/onboarding-provider';
import { useShortcuts } from '~/hooks/use-shortcuts';
import { formatKeysForDisplay, getOS } from '~/lib/shortcuts/utils';
import { useEventStore } from '~/stores/event.store';
import type { AudioLevelEvent } from '~/types/events';

export const Route = createFileRoute('/onboarding/push-to-talk-tutorial')({
  component: RecordingTutorialStep,
});

// Type for tutorial steps
type TutorialStep = {
  title: string;
  description: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  instruction: string;
};

// Hook to track recording tutorial steps using the app's event store
function useRecordingTutorialSteps() {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSpoken, setHasSpoken] = useState(false);

  // Use the same store pattern as other components
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const isRecording = useEventStore((state) => state.isRecording());
  const dictationStatus = useEventStore((state) => state.dictationStatus);
  const transcript = useEventStore((state) => state.transcript);

  const completeStep = React.useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => new Set(prev).add(stepIndex));
    setCurrentStep((prev) => Math.max(prev, stepIndex + 1));
    log.info(`[Tutorial] Completed step ${stepIndex + 1}`);
  }, []);

  const resetSteps = React.useCallback(() => {
    log.info('[Tutorial] Resetting all steps for retry');
    setCompletedSteps(new Set());
    setCurrentStep(0);
    setHasSpoken(false);
  }, []);

  // Track recording state changes from the store
  useEffect(() => {
    log.info('[Tutorial] Recording status changed:', recordingStatus);

    if (recordingStatus === 'recording') {
      completeStep(0); // Step 1: Started recording
    } else if (recordingStatus === 'processing') {
      completeStep(2); // Step 3: Released and processing
    }
  }, [recordingStatus, completeStep]);

  // Listen for audio levels to detect speech (only when recording)
  useEffect(() => {
    if (!isRecording || hasSpoken) {
      return;
    }

    let unlistenAudioLevel: (() => void) | undefined;

    const setupAudioLevelListener = async () => {
      unlistenAudioLevel = await listen<AudioLevelEvent>(
        'audio-level',
        (event) => {
          const audioData = event.payload;

          // Detect speech when recording and audio level is above threshold
          if (audioData.level > 0.05) {
            log.info('[Tutorial] Speech detected, level:', audioData.level);
            setHasSpoken(true);
            completeStep(1); // Step 2: Speaking detected
          }
        }
      );
    };

    setupAudioLevelListener().catch((error) => {
      log.error('Failed to setup audio level listener:', error);
    });

    return () => {
      unlistenAudioLevel?.();
    };
  }, [isRecording, hasSpoken, completeStep]);

  // Track dictation completion from the store
  useEffect(() => {
    log.info(
      '[Tutorial] Dictation status:',
      dictationStatus,
      'transcript:',
      transcript
    );

    if (dictationStatus === 'complete' && transcript) {
      log.info('[Tutorial] Dictation completed:', transcript);
      completeStep(3); // Step 4: Dictation completed
    }
  }, [dictationStatus, transcript, completeStep]);

  const isStepCompleted = React.useCallback(
    (stepIndex: number) => completedSteps.has(stepIndex),
    [completedSteps]
  );
  const isStepActive = React.useCallback(
    (stepIndex: number) => currentStep === stepIndex,
    [currentStep]
  );

  return {
    currentStep,
    isStepCompleted,
    isStepActive,
    isRecording,
    hasSpoken,
    dictationText: transcript ?? '',
    recordingStatus,
    dictationStatus,
    isAllStepsCompleted: completedSteps.size === 4, // Now 4 steps total
    resetSteps,
  };
}

// Component to render keyboard shortcuts with proper styling
const ShortcutBadge = ({ keys }: { keys: string[] }) => (
  <span className="mx-1 inline-flex items-center gap-1">
    {keys.map((key, index) => (
      <React.Fragment key={key}>
        <Badge
          className="inline-flex px-1.5 py-0.5 font-mono text-xs"
          variant="outline"
        >
          {key}
        </Badge>
        {index < keys.length - 1 && (
          <span className="text-muted-foreground text-xs">+</span>
        )}
      </React.Fragment>
    ))}
  </span>
);

// Component to show OR separator
const OrSeparator = () => (
  <div className="relative flex items-center justify-center">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-muted-foreground/30 border-t border-dashed" />
    </div>
    <span className="relative bg-background px-2 font-medium text-muted-foreground text-xs">
      OR
    </span>
  </div>
);

// Component to show recording method option
const MethodOption = ({
  label,
  action,
  shortcut,
  description,
}: {
  label: string;
  action: React.ReactNode;
  shortcut?: React.ReactNode;
  description: string;
}) => (
  <div className="flex items-center gap-2">
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
      <span className="font-semibold text-primary text-xs">{label}</span>
    </div>
    <div className="flex items-center gap-1 text-xs">
      {action}
      {shortcut}
      <span className="text-muted-foreground">{description}</span>
    </div>
  </div>
);

// Component to show recording method options
const RecordingMethodOptions = ({
  pushToTalkKeys,
  toggleKeys,
}: {
  pushToTalkKeys: string[];
  toggleKeys: string[];
}) => (
  <div className="mt-2 space-y-2">
    <MethodOption
      action={<strong>Hold</strong>}
      description="for push-to-talk"
      label="A"
      shortcut={<ShortcutBadge keys={pushToTalkKeys} />}
    />
    <OrSeparator />
    <MethodOption
      action={<strong>Press</strong>}
      description="to toggle on/off"
      label="B"
      shortcut={<ShortcutBadge keys={toggleKeys} />}
    />
  </div>
);

function RecordingTutorialStep() {
  const { markStepCompleted, sendMascotMessage, triggerMascotAnimation } =
    useOnboarding();

  // Track which messages have been sent to prevent duplicates
  const sentMessages = React.useRef(new Set<string>());
  const tutorialActionsPerformed = React.useRef(false);

  // Track previous dictation to detect empty results
  const previousDictationText = React.useRef<string | null>(null);
  const lastProcessedDictationStatus = React.useRef<string | null>(null);

  // Animation state for dictation text area
  const [shouldAnimateDictation, setShouldAnimateDictation] = useState(false);
  const lastAnimatedDictation = React.useRef<string>('');

  const {
    currentStep,
    isStepCompleted,
    dictationText,
    recordingStatus: _recordingStatus,
    dictationStatus,
    isAllStepsCompleted,
    resetSteps,
  } = useRecordingTutorialSteps();

  // Get both recording shortcuts from the shortcuts system
  const { shortcutCategories } = useShortcuts();
  const os = getOS();

  // Find both recording shortcuts
  const pushToTalkShortcut = shortcutCategories
    .flatMap((category) => category.shortcuts)
    .find((shortcut) => shortcut.id === 'push-to-talk');

  const toggleShortcut = shortcutCategories
    .flatMap((category) => category.shortcuts)
    .find((shortcut) => shortcut.id === 'toggle-recording');

  // Format the shortcut keys for display
  const pushToTalkKeys = pushToTalkShortcut
    ? formatKeysForDisplay(pushToTalkShortcut.keys, os)
    : ['Ctrl', 'Shift', 'X']; // Fallback to default

  const toggleKeys = toggleShortcut
    ? formatKeysForDisplay(toggleShortcut.keys, os)
    : ['Ctrl', 'Shift', 'R']; // Fallback to default

  // Helper to send message only once with persistence
  const sendMessageOnce = React.useCallback(
    (messageId: string, message: Parameters<typeof sendMascotMessage>[0]) => {
      if (sentMessages.current.has(messageId)) {
        log.info(
          `[Tutorial Messages] Skipping duplicate message: ${messageId}`
        );
        return;
      }

      log.info(`[Tutorial Messages] Sending message: ${messageId}`, message);
      sentMessages.current.add(messageId);
      sendMascotMessage({ ...message, persist: true });
    },
    [sendMascotMessage]
  );

  // Helper to reset tutorial steps for retry
  const resetForRetry = React.useCallback(() => {
    log.info('[Tutorial Messages] 🔄 Starting tutorial reset...');

    // Reset the actual step completion state
    resetSteps();

    // Clear step completion messages so they can be sent again
    const clearedMessages: string[] = [];
    for (const msg of ['step0', 'step1', 'step2', 'step3']) {
      if (sentMessages.current.has(msg)) {
        sentMessages.current.delete(msg);
        clearedMessages.push(msg);
      }
    }

    // Reset previous dictation tracking for fresh detection
    previousDictationText.current = null;

    // Reset animation tracking for fresh animations on retry
    lastAnimatedDictation.current = '';

    // Reset the event store dictation state to break the useEffect loop
    useEventStore.getState().resetDictationState();

    log.info('[Tutorial Messages] ✅ Tutorial reset complete:', {
      clearedMessages,
      remainingMessages: Array.from(sentMessages.current),
    });
  }, [resetSteps]);

  // Send initial tutorial message
  useEffect(() => {
    if (tutorialActionsPerformed.current) {
      return;
    }
    tutorialActionsPerformed.current = true;

    sendMessageOnce('initial', {
      content:
        "Perfect! Your microphone is all set up and ready to go. Now let's learn how to record! You can use either method: Push-to-talk (hold to record) or Toggle (press once to start/stop). Try whichever feels more comfortable!",
      type: 'celebration',
      duration: 8000,
      priority: 'high',
    });
  }, [sendMessageOnce]);

  // Check for empty dictation separately to handle retries
  useEffect(() => {
    // Only process when status changes TO "complete", not while it remains "complete"
    if (
      dictationStatus === 'complete' &&
      lastProcessedDictationStatus.current !== 'complete'
    ) {
      // Update the status tracker immediately
      lastProcessedDictationStatus.current = dictationStatus;

      const isEmptyDictation =
        !dictationText ||
        dictationText.trim() === '' ||
        dictationText.toLowerCase() === 'audio is silent.';

      log.info('[Tutorial Messages] Dictation completed:', {
        isEmptyDictation,
        dictationText: `"${dictationText}"`,
        previousText: `"${previousDictationText.current}"`,
      });

      if (isEmptyDictation) {
        // Only process if this is a NEW empty dictation (different from what we've seen)
        if (previousDictationText.current !== dictationText) {
          log.info(
            '[Tutorial Messages] 🚨 Empty dictation detected! Sending retry message'
          );

          // Update tracking BEFORE sending message to prevent loops
          previousDictationText.current = dictationText;

          // Send retry message immediately without the sendMessageOnce deduplication
          sendMascotMessage({
            content:
              "Hmm, I didn't catch that. Remember to hold the key down and speak clearly. Let's try again!",
            type: 'warning',
            duration: 5000,
            priority: 'high',
            persist: true,
          });

          // Reset tutorial state after sending the message
          setTimeout(() => {
            log.info(
              '[Tutorial Messages] 🔄 Resetting tutorial state for retry'
            );
            resetForRetry();
          }, 1500);
        } else {
          log.info(
            '[Tutorial Messages] ⏭️ Skipping duplicate empty dictation processing'
          );
        }
      } else if (dictationText) {
        // Update previous dictation reference for successful dictations
        previousDictationText.current = dictationText;
      }
    } else if (dictationStatus !== 'complete') {
      // Reset the status tracker when not complete
      lastProcessedDictationStatus.current = dictationStatus;
    }
  }, [dictationStatus, dictationText, sendMascotMessage, resetForRetry]);

  // Use primitive values to avoid function recreation issues
  const step0Completed = isStepCompleted(0);
  const step1Completed = isStepCompleted(1);
  const step2Completed = isStepCompleted(2);
  const step3Completed = isStepCompleted(3);

  // Track the last processed dictation to prevent infinite loops
  const lastProcessedDictation = React.useRef<string>('');

  // Helper function to process individual step messages
  const processStepMessages = React.useCallback(() => {
    if (step0Completed && !sentMessages.current.has('step0')) {
      sendMessageOnce('step0', {
        content: `Great! You started recording! Now say "I love Voice Gecko"`,
        type: 'info',
        duration: 2000,
        priority: 'high',
      });
    }

    if (step1Completed && !sentMessages.current.has('step1')) {
      sendMessageOnce('step1', {
        content: 'Perfect! I hear you! 👂',
        type: 'info',
        duration: 2000,
        priority: 'high',
      });
    }
  }, [step0Completed, step1Completed, sendMessageOnce]);

  // Helper function to handle completion celebration
  const handleCompletion = React.useCallback(() => {
    if (!sentMessages.current.has('complete')) {
      sendMessageOnce('complete', {
        content:
          "🎉 Congratulations! You've mastered recording with VoiceGecko!",
        type: 'success',
        duration: 4000,
        priority: 'high',
      });
    }

    if (!sentMessages.current.has('immediate-celebration')) {
      sentMessages.current.add('immediate-celebration');
      triggerMascotAnimation('dancing');
    }

    if (!sentMessages.current.has('tutorial-completed')) {
      sentMessages.current.add('tutorial-completed');
      markStepCompleted('tutorial', 100);
    }

    lastProcessedDictation.current = dictationText;
  }, [
    sendMessageOnce,
    triggerMascotAnimation,
    markStepCompleted,
    dictationText,
  ]);

  // Trigger animation when new dictation text appears
  useEffect(() => {
    if (
      dictationText &&
      dictationText.trim() !== '' &&
      dictationText !== lastAnimatedDictation.current
    ) {
      log.info('[Tutorial Animation] Triggering dictation animation:', {
        dictationText,
        lastAnimatedDictation: lastAnimatedDictation.current,
      });

      // Update the ref immediately to prevent duplicate animations
      lastAnimatedDictation.current = dictationText;
      setShouldAnimateDictation(true);

      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setShouldAnimateDictation(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [dictationText]);

  // Handle step completion messages with stable dependencies
  useEffect(() => {
    // Skip if we've already processed this exact dictation state
    if (
      dictationText === lastProcessedDictation.current &&
      isAllStepsCompleted
    ) {
      return;
    }

    log.info('[Tutorial Messages] Step progression check:', {
      isStepCompleted0: step0Completed,
      isStepCompleted1: step1Completed,
      isStepCompleted2: step2Completed,
      isStepCompleted3: step3Completed,
      isAllStepsCompleted,
      dictationText: `"${dictationText}"`,
    });

    const hasValidDictation = dictationText && dictationText.trim() !== '';
    const shouldProcessSteps = !step3Completed || hasValidDictation;

    if (!shouldProcessSteps) {
      log.info(
        '[Tutorial Messages] ⏭️ Skipping step processing due to empty dictation'
      );
      return;
    }

    processStepMessages();

    if (
      isAllStepsCompleted &&
      hasValidDictation &&
      !sentMessages.current.has('complete')
    ) {
      handleCompletion();
    }
  }, [
    step0Completed,
    step1Completed,
    step2Completed,
    step3Completed,
    dictationText,
    isAllStepsCompleted,
    processStepMessages,
    handleCompletion,
  ]);

  const steps: TutorialStep[] = [
    {
      title: 'Start recording',
      description: (
        <>
          <span>Choose your recording method:</span>
          <RecordingMethodOptions
            pushToTalkKeys={pushToTalkKeys}
            toggleKeys={toggleKeys}
          />
        </>
      ),
      icon: KeyRound,
      instruction:
        'Use either push-to-talk (hold) or toggle (press once) to start recording',
    },
    {
      title: 'Speak your message',
      description: (
        <>
          Say something like <strong>I love VoiceGecko</strong>
        </>
      ),
      icon: Mic,
      instruction: 'Try saying: I love VoiceGecko',
    },
    {
      title: 'Stop recording',
      description: (
        <div className="mt-2 space-y-2">
          <MethodOption
            action={<strong>Release</strong>}
            description="the key (push-to-talk)"
            label="A"
          />
          <OrSeparator />
          <MethodOption
            action={<strong>Press</strong>}
            description="again (toggle)"
            label="B"
            shortcut={<ShortcutBadge keys={toggleKeys} />}
          />
        </div>
      ),
      icon: CheckCircle,
      instruction: 'Stop recording using your chosen method',
    },
    {
      title: 'Dictation complete',
      description: 'Your text is ready and copied to clipboard!',
      icon: Clipboard,
      instruction: 'Your transcribed text appears below and in the mascot chat',
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 px-6 py-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
          {/* Left Column - Tutorial Steps */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="h-fit shadow-lg">
              <CardHeader>
                <CardTitle>Dictation Tutorial</CardTitle>
                <CardDescription>
                  Learn how to record and transcribe with VoiceGecko. Your
                  dictation will appear on the right when ready!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Stepper
                  className="w-full"
                  orientation="vertical"
                  value={currentStep}
                >
                  {steps.map((step, index) => (
                    <StepperItem
                      className="relative not-last:flex-1 items-start"
                      completed={isStepCompleted(index)}
                      key={step.title}
                      step={index + 1}
                    >
                      <StepperTrigger className="items-start rounded pb-8 last:pb-0">
                        <StepperIndicator>
                          <step.icon className="h-3 w-3" />
                        </StepperIndicator>
                        <div className="mt-0.5 space-y-0.5 px-2 text-left">
                          <StepperTitle className="font-semibold text-sm">
                            {step.title}
                          </StepperTitle>
                          <StepperDescription className="text-muted-foreground text-xs">
                            {step.description}
                          </StepperDescription>
                        </div>
                      </StepperTrigger>
                      {index < steps.length - 1 && (
                        <StepperSeparator className="-order-1 -translate-x-1/2 absolute inset-y-0 top-[calc(1.5rem+0.125rem)] left-3 m-0 group-data-[orientation=vertical]/stepper:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:w-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:flex-none" />
                      )}
                    </StepperItem>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Dictation Result */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <AudioLines className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Dictation Result</CardTitle>
                    <CardDescription>
                      {dictationText
                        ? 'Your voice has been converted to text'
                        : 'Your dictation will appear here'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  animate={
                    shouldAnimateDictation
                      ? {
                          borderColor: [
                            'hsl(var(--border))',
                            'hsl(217, 91%, 60%)',
                            'hsl(var(--border))',
                          ],
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                            '0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 8px rgba(59, 130, 246, 0.2)',
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                          ],
                        }
                      : {}
                  }
                  className="rounded-md border border-input"
                  transition={{
                    duration: 1.2,
                    ease: 'easeInOut',
                    times: [0, 0.5, 1],
                  }}
                >
                  <Textarea
                    className="min-h-[120px] resize-none border-0 focus-visible:ring-0"
                    placeholder="Start the tutorial and your dictation will appear here..."
                    readOnly
                    value={dictationText || ''}
                  />
                </motion.div>
                {dictationText && (
                  <div className="mt-2 text-muted-foreground text-xs">
                    <span>✓ Automatically copied to clipboard</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
