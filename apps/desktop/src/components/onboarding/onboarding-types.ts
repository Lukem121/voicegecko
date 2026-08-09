export type OnboardingStep = 'microphone' | 'tutorial' | 'completion';

export type OnboardingStepProps = {
  onNext: () => void;
  onPrevious: () => void;
  canProceed: boolean;
  setCanProceed: (canProceed: boolean) => void;
};
