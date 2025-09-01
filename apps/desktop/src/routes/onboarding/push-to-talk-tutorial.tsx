import { log } from '@acme/observability/log';
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
import { AudioLines, GraduationCap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { AudioVisualizer } from '~/components/audio-visualizer';
import { useOnboarding } from '~/components/onboarding/onboarding-provider';
import { useAudioProcessor } from '~/hooks/use-audio-processor';
import { useShortcuts } from '~/hooks/use-shortcuts';
import { formatKeysForDisplay, getOS } from '~/lib/shortcuts/utils';
import { useEventStore } from '~/stores/event.store';
import type { AudioLevelEvent } from '~/types/events';

export const Route = createFileRoute('/onboarding/push-to-talk-tutorial')({
  component: RecordingTutorialStep,
});

// Removed in favor of simplified stacked layout

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
            log.info(audioData.level, '[Tutorial] Speech detected, level:');
            setHasSpoken(true);
            completeStep(1); // Step 2: Speaking detected
          }
        }
      );
    };

    setupAudioLevelListener().catch((error) => {
      log.error(error, 'Failed to setup audio level listener:');
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
const ShortcutBadge = ({
  keys,
  size = 'md',
}: {
  keys: string[];
  size?: 'sm' | 'md';
}) => {
  const sizeClasses =
    size === 'md' ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-xs';
  const plusSize = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <span className="mx-1 inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          <Badge
            className={`inline-flex font-mono ${sizeClasses}`}
            variant="outline"
          >
            {key}
          </Badge>
          {index < keys.length - 1 && (
            <span className={`text-muted-foreground ${plusSize}`}>+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
};

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
  const { markStepCompleted } = useOnboarding();

  // Track which messages have been sent to prevent duplicates
  const sentMessages = React.useRef(new Set<string>());

  // Track previous dictation to detect empty results
  const previousDictationText = React.useRef<string | null>(null);
  const lastProcessedDictationStatus = React.useRef<string | null>(null);

  // Animation state for dictation text area
  const [shouldAnimateDictation, setShouldAnimateDictation] = useState(false);
  const lastAnimatedDictation = React.useRef<string>('');

  const {
    isStepCompleted,
    isRecording,
    dictationText,
    recordingStatus,
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
  }, [dictationStatus, dictationText, resetForRetry]);

  // Use primitive values to avoid function recreation issues
  const step0Completed = isStepCompleted(0);
  const step1Completed = isStepCompleted(1);
  const step2Completed = isStepCompleted(2);
  const step3Completed = isStepCompleted(3);

  // Track the last processed dictation to prevent infinite loops
  const lastProcessedDictation = React.useRef<string>('');

  // Helper function to handle completion celebration
  const handleCompletion = React.useCallback(() => {
    if (!sentMessages.current.has('tutorial-completed')) {
      sentMessages.current.add('tutorial-completed');
      markStepCompleted('tutorial', 100);
    }

    lastProcessedDictation.current = dictationText;
  }, [markStepCompleted, dictationText]);

  // Trigger animation when a dictation completes and new text appears
  useEffect(() => {
    if (
      dictationStatus === 'complete' &&
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
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [dictationText, dictationStatus]);

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
    handleCompletion,
  ]);

  // Derived transcribing state based on dictation status
  const isDictationTranscribing = useEventStore((state) =>
    state.isTranscribing()
  );

  // Live audio level + status for quick visual feedback
  const { audioLevel, isActive } = useAudioProcessor({
    isRecording: Boolean(isRecording),
    isTranscribing: isDictationTranscribing,
    isTransitioning: recordingStatus === 'processing',
    recordingStatus: recordingStatus ?? 'idle',
  });

  const getStatusBadge = () => {
    if (recordingStatus === 'recording') {
      return (
        <Badge className="bg-red-50 text-red-600" variant="secondary">
          Recording
        </Badge>
      );
    }
    if (recordingStatus === 'processing' || isDictationTranscribing) {
      return (
        <Badge className="bg-amber-50 text-amber-600" variant="secondary">
          Processing
        </Badge>
      );
    }
    if (dictationStatus === 'complete') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700" variant="secondary">
          Ready
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted/50" variant="secondary">
        Idle
      </Badge>
    );
  };

  const prefersReducedMotion = useReducedMotion();

  const dictationAnimation = React.useMemo(() => {
    if (!shouldAnimateDictation) {
      return {};
    }
    if (prefersReducedMotion) {
      return {
        borderColor: [
          'hsl(var(--border))',
          'hsl(var(--primary))',
          'hsl(var(--border))',
        ],
      };
    }
    return {
      borderColor: [
        'hsl(var(--border))',
        'hsl(var(--primary))',
        'hsl(var(--border))',
      ],
      boxShadow: [
        '0 0 0 0 rgba(0, 0, 0, 0)',
        '0 0 0 5px rgba(59, 130, 246, 0.24), 0 0 14px rgba(59, 130, 246, 0.18)',
        '0 0 0 0 rgba(0, 0, 0, 0)',
      ],
    };
  }, [shouldAnimateDictation, prefersReducedMotion]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 px-6 py-8">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-8">
          {/* Left Column - Tutorial Steps */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="h-fit shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Learn to record</CardTitle>
                    <CardDescription>
                      Two ways to record. Try one now — your text will appear
                      below.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Start: Methods + Live Indicator */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
                  <div className="rounded-md border bg-muted/10 p-3">
                    <div className="mb-2 text-muted-foreground text-xs">
                      Recording methods
                    </div>
                    <RecordingMethodOptions
                      pushToTalkKeys={pushToTalkKeys}
                      toggleKeys={toggleKeys}
                    />
                  </div>
                  <div className="flex flex-col gap-4 rounded-md border bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <AudioLines className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-xs">
                        <div className="font-medium">Live input</div>
                        <div className="text-muted-foreground">
                          Speak to see activity
                        </div>
                      </div>
                    </div>
                    <div className="flex h-14 items-center justify-between gap-2">
                      <AudioVisualizer
                        audioLevel={audioLevel as AudioLevelEvent}
                        className="ml-4"
                        isRecording={Boolean(isActive || isRecording)}
                        size="large"
                      />
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Dictation Result */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <AudioLines className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Dictation result</CardTitle>
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
                  animate={dictationAnimation}
                  className="rounded-md border border-input"
                  transition={{
                    duration: 1.2,
                    ease: 'easeInOut',
                    times: [0, 0.5, 1],
                  }}
                >
                  <Textarea
                    aria-label="Dictation result"
                    className="min-h-[120px] resize-none border-0 focus-visible:ring-0"
                    placeholder="Speak now and your dictation will appear here..."
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
