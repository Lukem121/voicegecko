'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import {
  getPerUnitPriceDisplay,
  getPriceDisplay,
  getYearlyPriceAsMonthly,
} from './utils/price-utils';

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
  const searchParams = useSearchParams();
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
  const trpcClient = useTRPC();
  const effectiveSubOptions =
    trpcClient.stripe.getEffectiveSubscription.queryOptions();
  const effectiveSubQuery = useQuery(effectiveSubOptions);
  const {
    isOpen: isStudentModalOpen,
    openModal: openStudentModal,
    closeModal: closeStudentModal,
  } = useStudentDiscountModal();
  const trpc = useTRPC();
  const teamCheckoutOptions =
    trpc.stripe.createTeamCheckoutSession.mutationOptions();
  const teamCheckout = useMutation(teamCheckoutOptions);
  const [autoCheckoutAttempted, setAutoCheckoutAttempted] = useState(false);

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
    {
      name: 'Team',
      id: 'voice gecko team',
      stripeId: 'voice gecko team',
      monthlyPrice: getPerUnitPriceDisplay(prices, {
        planId: 'voice gecko team',
        interval: 'monthly',
        currency,
        fallback: '$5.99',
      }),
      yearlyMonthlyPrice: getYearlyPriceAsMonthly(
        prices,
        'voice gecko team',
        currency,
        '$4.79'
      ),
      subtitle: 'Per seat pricing (min 3 seats)',
      features: [
        'Unlimited dictations (per seat)',
        'Invite team members',
        'Manage seats in billing portal',
      ],
      cta: 'Start Team Plan',
      variant: 'outline',
    },
  ];

  const handlePaidPlan = async (plan: Plan, billingIsAnnual: boolean) => {
    if (plan.stripeId) {
      // For Team plan, use custom checkout to enable adjustable quantity
      if (plan.stripeId === 'voice gecko team') {
        try {
          const result = await teamCheckout.mutateAsync({
            interval: billingIsAnnual ? 'yearly' : 'monthly',
            initialQuantity: 3,
          });

          if (result?.url) {
            router.push(result.url);
            return;
          }
        } catch (teamCheckoutError) {
          log.error(teamCheckoutError, 'Failed to initiate team checkout');
        }
      } else {
        await upgrade(
          plan.stripeId as 'voice gecko pro' | 'voice gecko team',
          billingIsAnnual
        );
      }
    }
  };

  const handlePlanClick = async (
    plan: Plan,
    billingOverride?: BillingPeriod
  ) => {
    const billingValue = billingOverride ?? (isYearly ? 'annual' : 'monthly');
    const billingIsAnnual = billingValue === 'annual';

    if (!billingOverride && billingValue !== billingPeriod) {
      setBillingPeriod(billingValue);
    }

    if (!session?.user) {
      const redirectTarget = `/app/plans?auto=1&plan=${encodeURIComponent(
        plan.id
      )}&billing=${billingValue}`;
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    // Track plan selection
    trackEvent({
      event: 'plan_selected',
      plan_type: plan.id === 'voice gecko team' ? 'team' : 'pro',
      billing_period: billingValue,
      source: SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });

    // PostHog tracking
    trackPostHogEvent({
      event: 'plan_selected',
      plan_type: plan.id === 'voice gecko team' ? 'team' : 'pro',
      billing_period: billingValue,
      source: POSTHOG_SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });

    try {
      await handlePaidPlan(plan, billingIsAnnual);
    } catch (unknownError) {
      log.error(unknownError, 'Error handling plan:');
      showAlert('Error', 'An error occurred. Please try again.');
    }
  };

  const getCurrentPlanStatus = (planId: string) => {
    const effective = effectiveSubQuery.data ?? subscription;
    if (effective?.plan === planId) {
      return 'current';
    }
    return null;
  };

  useEffect(() => {
    if (autoCheckoutAttempted) {
      return;
    }

    if (!searchParams || searchParams.get('auto') !== '1') {
      return;
    }

    if (!session?.user) {
      return;
    }

    const planIdParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing') === 'annual' ? 'annual' : 'monthly';

    if (!planIdParam) {
      return;
    }

    const targetPlan = plans.find((plan) => plan.id === planIdParam);
    if (!targetPlan) {
      return;
    }

    setAutoCheckoutAttempted(true);

    if (billingParam !== billingPeriod) {
      setBillingPeriod(billingParam);
    }

    void handlePlanClick(targetPlan, billingParam);

    const cleaned = new URLSearchParams(searchParams.toString());
    cleaned.delete('auto');
    cleaned.delete('plan');
    cleaned.delete('billing');
    const remaining = cleaned.toString();
    router.replace(`/app/plans${remaining ? `?${remaining}` : ''}`);
  }, [autoCheckoutAttempted, billingPeriod, handlePlanClick, plans, router, searchParams, session?.user]);

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
          const isLoading =
            isUpgrading ||
            (plan.stripeId === 'voice gecko team' && teamCheckout.isPending);

          return (
            <PlanCard
              isCurrent={isCurrent}
              isLoading={isLoading}
              isYearly={isYearly}
              key={plan.name}
              onPlanClick={handlePlanClick}
              plan={plan}
              subscription={subscription}
            />
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
