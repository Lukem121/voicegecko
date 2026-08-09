import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@acme/ui/components/stepper';

import { useOnboarding } from './onboarding-provider';

export function OnboardingStepper() {
  const { steps, currentStep, state, goToStep, getStepIndex } = useOnboarding();

  const currentStepIndex = currentStep ? getStepIndex(currentStep.id) : 0;

  const handleStepClick = async (stepIndex: number) => {
    const targetStep = steps[stepIndex];
    if (targetStep) {
      // Allow free navigation to any step
      await goToStep(targetStep.id);
    }
  };

  return (
    <div className="border-border/50 border-b bg-white/50 px-8 py-4 backdrop-blur-sm dark:bg-gray-900/50">
      <div className="mx-auto max-w-4xl">
        {/* Stepper */}
        <Stepper defaultValue={currentStepIndex}>
          {steps.map((step, index) => {
            const isCompleted = state.completedSteps.has(step.id);
            const isActive = currentStep?.id === step.id;

            return (
              <StepperItem
                className="not-last:flex-1 max-md:items-start"
                completed={isCompleted}
                disabled={false}
                key={step.id} // Allow clicking any step
                step={index + 1}
              >
                <StepperTrigger
                  className=""
                  disabled={false}
                  onClick={() => handleStepClick(index)}
                >
                  <StepperIndicator />
                  <div className="text-center md:text-left">
                    <StepperTitle className={isActive ? 'text-primary' : ''}>
                      {step.title}
                    </StepperTitle>
                  </div>
                </StepperTrigger>
                {index < steps.length - 1 && (
                  <StepperSeparator className="max-md:mt-3.5 md:mx-4" />
                )}
              </StepperItem>
            );
          })}
        </Stepper>
      </div>
    </div>
  );
}
