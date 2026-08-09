import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { OnboardingBottomNavigation } from '~/components/onboarding/onboarding-bottom-navigation';
import type { OnboardingStepConfig } from '~/components/onboarding/onboarding-provider';
import { OnboardingProvider } from '~/components/onboarding/onboarding-provider';
import { OnboardingStepper } from '~/components/onboarding/onboarding-stepper';
import { OnboardingTitleBar } from '~/components/onboarding/onboarding-title-bar';
import { isLocalOnlyMode } from '~/lib/local-mode';

// Define the onboarding steps configuration
const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 'microphone',
    title: 'Set up your microphone',
    description: "Let's make sure your microphone is working properly",
    route: '/onboarding/microphone-setup',
    canSkip: true,
  },
  {
    id: 'tutorial',
    title: 'Learn to record',
    description: 'Master both recording methods in VoiceGecko',
    route: '/onboarding/push-to-talk-tutorial',
    canSkip: true,
  },
  {
    id: 'completion',
    title: "You're all set!",
    description: 'Welcome to VoiceGecko',
    route: '/onboarding/completion',
    canSkip: false,
    autoAdvance: false,
  },
];

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context, location }) => {
    const localOnly = await isLocalOnlyMode();

    // Local-only mode does not require authentication for onboarding
    if (!(localOnly || context.auth.isAuthenticated)) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: '/onboarding',
        },
      });
    }

    // If accessing /onboarding directly (not a child route), redirect to first step
    if (location.pathname === '/onboarding') {
      throw redirect({
        to: '/onboarding/microphone-setup',
      });
    }
  },
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <OnboardingTitleBar />

      {/* Main Content with Providers */}
      <div className="flex min-h-screen pt-12">
        <OnboardingProvider steps={ONBOARDING_STEPS}>
          <div className="flex flex-1 flex-col">
            {/* Stepper Navigation */}
            <OnboardingStepper />

            {/* Step Content */}
            <div className="flex-1">
              <Outlet />
            </div>
            <OnboardingBottomNavigation />
          </div>
        </OnboardingProvider>
      </div>
    </div>
  );
}
