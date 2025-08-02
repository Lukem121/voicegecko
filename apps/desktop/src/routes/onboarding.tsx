import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import type { OnboardingStepConfig } from "~/components/onboarding/onboarding-provider";
import {
  MascotChatProvider,
  mascotVariants,
  OnboardingMascotChat,
} from "~/components/mascot";
import { OnboardingBottomNavigation } from "~/components/onboarding/onboarding-bottom-navigation";
import {
  OnboardingProvider,
  useOnboarding,
} from "~/components/onboarding/onboarding-provider";
import { OnboardingStepper } from "~/components/onboarding/onboarding-stepper";
import { OnboardingTitleBar } from "~/components/onboarding/onboarding-title-bar";

// Define the onboarding steps configuration
const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: "microphone",
    title: "Set up your microphone",
    description: "Let's make sure your microphone is working properly",
    route: "/onboarding/microphone-setup",
    canSkip: true,
    mascotAnimation: "listening",
  },
  {
    id: "tutorial",
    title: "Learn to record",
    description: "Master both recording methods in VoiceGecko",
    route: "/onboarding/push-to-talk-tutorial",
    canSkip: true,
    mascotAnimation: "thinking",
  },
  {
    id: "completion",
    title: "You're all set!",
    description: "Welcome to VoiceGecko",
    route: "/onboarding/completion",
    canSkip: false,
    autoAdvance: false,
    mascotAnimation: "dancing",
  },
];

export const Route = createFileRoute("/onboarding")({
  beforeLoad: ({ context, location }) => {
    // Ensure user is authenticated before accessing onboarding
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: "/onboarding",
        },
      });
    }

    // If accessing /onboarding directly (not a child route), redirect to first step
    if (location.pathname === "/onboarding") {
      throw redirect({
        to: "/onboarding/microphone-setup",
      });
    }
  },
  component: OnboardingLayout,
});

// Component to handle mascot variant selection based on current step and completion status
function MascotWithVariantSelection() {
  const { currentStep, state } = useOnboarding();

  // Select mascot variant based on current step and tutorial completion status
  const getMascotVariant = () => {
    // If tutorial has been completed, show dancing confetti variant
    if (state.completedSteps.has("tutorial")) {
      return mascotVariants.dancingWithConfetti;
    }

    // Otherwise, use step-based selection
    if (currentStep?.id === "microphone") {
      return mascotVariants.withMicrophone;
    }
    if (currentStep?.id === "completion") {
      return mascotVariants.dancingWithConfetti;
    }
    return mascotVariants.default;
  };

  return (
    <OnboardingMascotChat
      variant={getMascotVariant()}
      onMascotClick={() => {
        // Optional: Add mascot interaction
        console.log("Mascot clicked!");
      }}
    />
  );
}

function OnboardingLayout() {
  return (
    <div className="from-background via-background to-primary/5 relative min-h-screen bg-gradient-to-br">
      <OnboardingTitleBar />

      {/* Main Content with Providers */}
      <div className="flex min-h-screen pt-12">
        <MascotChatProvider defaultAnimation={{ type: "welcoming" }}>
          <OnboardingProvider steps={ONBOARDING_STEPS}>
            <div className="flex flex-1">
              {/* Left Column - Stepper + Step Content */}
              <div className="flex flex-1 flex-col">
                {/* Stepper Navigation - Only above left panel */}
                <OnboardingStepper />

                {/* Step Content */}
                <div className="flex-1">
                  <Outlet />
                </div>
                <OnboardingBottomNavigation />
              </div>

              {/* Right Column - Mascot & Chat */}
              <div className="border-border/50 from-primary/5 to-primary/10 w-80 border-l bg-gradient-to-b">
                <MascotWithVariantSelection />
              </div>
            </div>
          </OnboardingProvider>
        </MascotChatProvider>
      </div>
    </div>
  );
}
