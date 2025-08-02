import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  SkipForward,
} from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";

import { useOnboarding } from "./onboarding-provider";

export function OnboardingBottomNavigation() {
  const {
    steps,
    currentStep,
    previousStep,
    nextStep,
    skipOnboarding,
    getStepIndex,
  } = useOnboarding();

  const currentStepIndex = currentStep ? getStepIndex(currentStep.id) : 0;
  const hasPreviousStep = currentStepIndex > 0;
  const hasNextStep = currentStepIndex < steps.length - 1;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="border-border/50 border-t bg-white/50 px-8 py-4 backdrop-blur-sm dark:bg-gray-900/50">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        {/* Left Side - Back Button */}
        <div className="flex items-center space-x-2">
          {hasPreviousStep ? (
            <Button
              variant="outline"
              onClick={() => previousStep()}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div /> // Empty div to maintain spacing
          )}
        </div>

        {/* Right Side - Next/Skip/Complete Buttons */}
        <div className="flex items-center space-x-2">
          {/* Skip Button - Show on all steps except last */}
          {!isLastStep && (
            <Button
              variant="ghost"
              onClick={() => skipOnboarding()}
              className="flex items-center gap-2"
            >
              Skip
              <ChevronsRight className="h-4 w-4" />
            </Button>
          )}

          {/* Next/Complete Button */}
          {hasNextStep ? (
            <Button
              onClick={() => nextStep()}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => skipOnboarding()} // Complete onboarding
              className="flex items-center gap-2"
            >
              Complete Setup
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
