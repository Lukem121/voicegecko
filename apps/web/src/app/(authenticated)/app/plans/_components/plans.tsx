'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability';
import type { Subscription } from '@better-auth/stripe';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';
import { authClient } from '~/lib/auth/client';
import { useCurrency } from '~/providers/currency';
import { useTRPC } from '~/trpc/react';
import { useCreateBillingPortalSession } from '../../_hooks/use-create-billing-portal-session';
import { AlertBanner } from './alert-banner';
import { BillingToggle } from './billing-toggle';
import { type Plan, PlanCard } from './plan-card';
import { PlanComparison } from './plan-comparison';
import { PlansErrorState } from './plans-error-state';
import { StudentDiscountCard } from './student-discount-card';
import { getPriceDisplay, getYearlyPriceAsMonthly } from './utils/price-utils';

type BillingPeriod = 'monthly' | 'annual';

interface PlansProps {
  prices: Record<string, PriceWithMetadata>;
  subscription: Subscription | null;
  error: {
    code?: string | undefined;
    message?: string | undefined;
    status: number;
    statusText: string;
  } | null;
}

interface AlertState {
  show: boolean;
  variant: 'default' | 'destructive';
  title: string;
  message: string;
}

export default function Plans({ prices, subscription, error }: PlansProps) {
  const router = useRouter();
  const createBillingPortalSessionMutation = useCreateBillingPortalSession();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const { currency } = useCurrency();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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
      monthlyPrice: getPriceDisplay(
        prices,
        'voice gecko pro',
        'monthly',
        currency,
        '$29'
      ),
      yearlyMonthlyPrice: getYearlyPriceAsMonthly(
        prices,
        'voice gecko pro',
        currency,
        '$24'
      ),
      subtitle: 'All of our features',
      features: [
        'Unlimited transcriptions',
        'Advanced AI processing',
        'Export formats',
        'Priority support',
        'Cloud sync',
        'Advanced features',
      ],
      cta: 'Get started',
      variant: 'outline',
    },
  ];

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This is a complex function
  const handlePlanClick = async (plan: Plan) => {
    if (!session?.user) {
      router.push('/sign-in');
      return;
    }

    try {
      setLoadingPlan(plan.id);

      // If it's the free plan and user has a subscription, redirect to billing portal
      if (plan.isFree && subscription) {
        const result = await createBillingPortalSessionMutation.mutateAsync({
          returnUrl: '/app/plans',
        });

        if (result.url) {
          router.push(result.url);
        }
        return;
      }

      // If it's a paid plan
      if (plan.stripeId) {
        const { error: upgradeError } = await authClient.subscription.upgrade({
          plan: plan.stripeId,
          successUrl: '/app/plans',
          cancelUrl: '/app/plans',
          annual: isYearly,
          // If user has an active subscription, provide the subscription ID for plan switching
          ...(subscription?.stripeSubscriptionId && {
            subscriptionId: subscription.stripeSubscriptionId,
          }),
          fetchOptions: {
            headers: {
              'x-currency': currency,
            },
          },
        });

        if (upgradeError) {
          log.error('Subscription error:', upgradeError);
          showAlert(
            'Subscription Error',
            upgradeError.message ?? 'Failed to process subscription'
          );
        }
      }
    } catch (unknownError) {
      log.error('Error handling plan:', unknownError);
      showAlert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoadingPlan(null);
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
      <div className="mb-8 flex items-center justify-between">
        <div className="">
          <h1 className="mb-2 font-semibold text-2xl tracking-tight">Plans</h1>
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
          const isLoading = loadingPlan === plan.id;

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
