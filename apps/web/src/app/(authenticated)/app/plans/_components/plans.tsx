'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DesktopRedirectHandler } from '~/components/desktop-redirect-handler';
import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useGTM } from '~/hooks/use-gtm';
import { usePostHog } from '~/hooks/use-posthog';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';
import { useSubscriptionUpgrade } from '~/hooks/use-subscription-upgrade';
import { authClient } from '~/lib/auth/client';
import { SOURCES } from '~/lib/gtm/constants';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { useCurrency } from '~/providers/currency';
import { useTRPC } from '~/trpc/react';
import { AlertBanner } from './alert-banner';
import { BillingToggle } from './billing-toggle';
import { type Plan, PlanCard } from './plan-card';
import { PlanComparison } from './plan-comparison';
import { PlansErrorState } from './plans-error-state';
import { StudentDiscountCard } from './student-discount-card';
import { getPriceDisplay, getYearlyPriceAsMonthly } from './utils/price-utils';

type BillingPeriod = 'monthly' | 'annual';

type PlansProps = {
  prices: Record<string, PriceWithMetadata>;
  subscription: Subscription | null;
  error: {
    code?: string | undefined;
    message?: string | undefined;
    status: number;
    statusText: string;
  } | null;
};

type AlertState = {
  show: boolean;
  variant: 'default' | 'destructive';
  title: string;
  message: string;
};

export default function Plans({ prices, subscription, error }: PlansProps) {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const { currency } = useCurrency();
  const { trackEvent } = useGTM();
  const { trackEvent: trackPostHogEvent } = usePostHog();
  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    variant: 'default',
    title: '',
    message: '',
  });
  const { data: session } = authClient.useSession();
  const {
    isOpen: isStudentModalOpen,
    openModal: openStudentModal,
    closeModal: closeStudentModal,
  } = useStudentDiscountModal();
  const _trpc = useTRPC();

  const showAlert = (
    title: string,
    message: string,
    variant: 'default' | 'destructive' = 'destructive'
  ) => {
    setAlertState({
      show: true,
      variant,
      title,
      message,
    });
  };

  const { upgrade, isUpgrading } = useSubscriptionUpgrade({
    subscriptionId: subscription?.stripeSubscriptionId,
    onError: (upgradeError) => {
      showAlert(
        'Subscription Error',
        upgradeError.message ?? 'Failed to process subscription'
      );
    },
  });

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, show: false }));
  };

  const isYearly = billingPeriod === 'annual';

  // Handle error state
  if (error) {
    return <PlansErrorState error={error} />;
  }

  // Dynamic plans with prices from Stripe
  const plans: Plan[] = [
    {
      name: 'Basic',
      id: 'basic',
      stripeId: null, // No Stripe subscription for free plan
      monthlyPrice: '$0',
      yearlyMonthlyPrice: '$0',
      isFree: true,
      subtitle: 'Start of your productivity journey',
      features: [
        '2,000 words per week',
        'Lightning fast voice typing',
        'Add words to dictionary',
        'Privacy mode',
      ],
      cta: 'Get started',
      variant: 'outline',
    },
    {
      name: 'Pro',
      id: 'voice gecko pro',
      stripeId: 'voice gecko pro', // This matches the plan name in auth config
      monthlyPrice: getPriceDisplay(prices, {
        planId: 'voice gecko pro',
        interval: 'monthly',
        currency,
        fallback: '$29',
      }),
      yearlyMonthlyPrice: getYearlyPriceAsMonthly(
        prices,
        'voice gecko pro',
        currency,
        '$24'
      ),
      subtitle: 'All of our features',
      features: [
        'Unlimited dictations',
        'Advanced AI processing',
        'Export formats',
        'Priority support',
        'Cloud sync',
        'Advanced features',
      ],
      cta: 'Upgrade',
      variant: 'outline',
    },
  ];

  const handleFreePlanWithSubscription = () => {
    router.push('/download');
  };

  const handlePaidPlan = async (plan: Plan) => {
    if (plan.stripeId) {
      await upgrade(plan.stripeId as 'voice gecko pro', isYearly);
    }
  };

  const handlePlanClick = async (plan: Plan) => {
    if (!session?.user) {
      router.push('/sign-in');
      return;
    }

    // Track plan selection
    trackEvent({
      event: 'plan_selected',
      plan_type: plan.isFree ? 'free' : 'pro',
      billing_period: isYearly ? 'yearly' : 'monthly',
      source: SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });

    // PostHog tracking
    trackPostHogEvent({
      event: 'plan_selected',
      plan_type: plan.isFree ? 'free' : 'pro',
      billing_period: isYearly ? 'yearly' : 'monthly',
      source: POSTHOG_SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });

    try {
      if (plan.isFree && subscription) {
        await handleFreePlanWithSubscription();
        return;
      }

      if (!plan.isFree) {
        await handlePaidPlan(plan);
      }
    } catch (unknownError) {
      log.error(unknownError, 'Error handling plan:');
      showAlert('Error', 'An error occurred. Please try again.');
    }
  };

  const getCurrentPlanStatus = (planId: string) => {
    if (!subscription && planId === 'basic') {
      return 'current';
    }
    if (subscription?.plan === planId) {
      return 'current';
    }
    return null;
  };

  return (
    <div>
      {/* Handle desktop app redirects for cross-platform flows */}
      <DesktopRedirectHandler
        onNoRedirectNeeded={() => log.info('ℹ️ No desktop redirect needed')}
        onRedirectFailed={() =>
          log.warn('⚠️ Desktop redirect failed, staying on web')
        }
        onRedirectStart={() =>
          log.info('🔄 Redirecting back to desktop app...')
        }
      />

      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-8">
        <h1 className="font-semibold text-2xl tracking-tight sm:hidden">
          Plans
        </h1>
        <div className="hidden sm:block">
          <h1 className="font-semibold text-2xl tracking-tight sm:mb-2">
            Plans
          </h1>
          <p className="text-muted-foreground">
            Choose the plan that works for you
          </p>
        </div>
        {/* Billing Toggle */}
        <BillingToggle
          selected={billingPeriod}
          setSelected={setBillingPeriod}
        />
      </div>

      {/* Dynamic Alert */}
      <AlertBanner
        message={alertState.message}
        onClose={hideAlert}
        show={alertState.show}
        title={alertState.title}
        variant={alertState.variant}
      />

      {/* Plans */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = getCurrentPlanStatus(plan.id) === 'current';
          // Use the hook's isUpgrading state for all plans
          const isLoading = isUpgrading;

          // On mobile, show Pro plan first (order-1), Basic plan second (order-2)
          // On desktop, maintain normal order
          const mobileOrder = plan.isFree
            ? 'order-2 md:order-none'
            : 'order-1 md:order-none';

          return (
            <div className={mobileOrder} key={plan.name}>
              <PlanCard
                isCurrent={isCurrent}
                isLoading={isLoading}
                isYearly={isYearly}
                onPlanClick={handlePlanClick}
                plan={plan}
                subscription={subscription}
              />
            </div>
          );
        })}
      </div>

      {/* Student Discount Card */}
      <StudentDiscountCard onGetStarted={openStudentModal} />

      {/* Plans and Features */}
      <PlanComparison />

      <StudentDiscountModal
        isOpen={isStudentModalOpen}
        onClose={closeStudentModal}
      />
    </div>
  );
}
