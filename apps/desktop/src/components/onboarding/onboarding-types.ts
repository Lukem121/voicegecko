export type OnboardingStep = 'microphone' | 'tutorial' | 'completion';

export interface OnboardingStepProps {
  onNext: () => void;
  onPrevious: () => void;
  canProceed: boolean;
  setCanProceed: (canProceed: boolean) => void;
}
