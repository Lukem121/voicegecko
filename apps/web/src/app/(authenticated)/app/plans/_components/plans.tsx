'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability/log';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DesktopRedirectHandler } from '~/components/desktop-redirect-handler';
import { useGTM } from '~/hooks/use-gtm';
import { usePostHog } from '~/hooks/use-posthog';
import { useSubscriptionUpgrade } from '~/hooks/use-subscription-upgrade';
import { authClient } from '~/lib/auth/client';
import { SOURCES } from '~/lib/gtm/constants';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { useCurrency } from '~/providers/currency';
import { useTRPC } from '~/trpc/react';
import { AlertBanner } from './alert-banner';
import { type Plan, type PlansSubscription, PlanCard } from './plan-card';
import { PlansErrorState } from './plans-error-state';
import { getPriceDisplay } from './utils/price-utils';

type PlansProps = {
  prices: Record<string, PriceWithMetadata>;
  subscription: PlansSubscription;
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

const SHARED_FEATURES = [
  'Unlimited dictations',
  'Lightning fast dictation',
  'Global shortcut access',
  'Custom dictionary',
  'Privacy mode',
  'Open source',
];

export default function Plans({ prices, subscription, error }: PlansProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    subscriptionId: subscription?.stripeSubscriptionId ?? undefined,
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

  if (error) {
    return <PlansErrorState error={error} />;
  }

  const plans: Plan[] = [
    {
      name: 'Free',
      id: 'free',
      stripeId: null,
      monthlyPrice: 'Free',
      yearlyMonthlyPrice: 'Free',
      subtitle: 'Full product. No limits.',
      features: SHARED_FEATURES,
      cta: 'Download App',
      variant: 'outline',
    },
    {
      name: 'Support',
      id: 'voice gecko pro',
      stripeId: 'voice gecko pro',
      monthlyPrice: getPriceDisplay(prices, {
        planId: 'voice gecko pro',
        interval: 'monthly',
        currency,
        fallback: '$5.99',
      }),
      yearlyMonthlyPrice: getPriceDisplay(prices, {
        planId: 'voice gecko pro',
        interval: 'monthly',
        currency,
        fallback: '$5.99',
      }),
      subtitle: 'Optional — same product, helps fund development',
      features: SHARED_FEATURES,
      cta: 'Support Voice Gecko',
      variant: 'default',
    },
  ];

  const handlePlanClick = async (plan: Plan) => {
    if (!plan.stripeId) {
      router.push('/download');
      return;
    }

    if (!session?.user) {
      const redirectTarget = `/app/plans?auto=1&plan=${encodeURIComponent(
        plan.id
      )}&billing=monthly`;
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    trackEvent({
      event: 'plan_selected',
      plan_type: 'pro',
      billing_period: 'monthly',
      source: SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });

    trackPostHogEvent({
      event: 'plan_selected',
      plan_type: 'pro',
      billing_period: 'monthly',
      source: POSTHOG_SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });

    try {
      await upgrade('voice gecko pro', false);
    } catch (unknownError) {
      log.error(unknownError, 'Error handling plan:');
      showAlert('Error', 'An error occurred. Please try again.');
    }
  };

  const getCurrentPlanStatus = (planId: string) => {
    const effective = effectiveSubQuery.data ?? subscription;
    if (planId === 'free' && !effective) {
      return 'current';
    }
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
    if (planIdParam !== 'voice gecko pro') {
      return;
    }

    setAutoCheckoutAttempted(true);
    void upgrade('voice gecko pro', false).catch((unknownError) => {
      log.error(unknownError, 'Error handling auto checkout:');
      setAlertState({
        show: true,
        variant: 'destructive',
        title: 'Error',
        message: 'An error occurred. Please try again.',
      });
    });

    const cleaned = new URLSearchParams(searchParams.toString());
    cleaned.delete('auto');
    cleaned.delete('plan');
    cleaned.delete('billing');
    const remaining = cleaned.toString();
    router.replace(`/app/plans${remaining ? `?${remaining}` : ''}`);
  }, [autoCheckoutAttempted, router, searchParams, session?.user, upgrade]);

  return (
    <div>
      <DesktopRedirectHandler
        onNoRedirectNeeded={() => log.info('ℹ️ No desktop redirect needed')}
        onRedirectFailed={() =>
          log.warn('⚠️ Desktop redirect failed, staying on web')
        }
        onRedirectStart={() =>
          log.info('🔄 Redirecting back to desktop app...')
        }
      />

      <div className="mb-4 sm:mb-8">
        <h1 className="font-semibold text-2xl tracking-tight sm:mb-2">
          Support
        </h1>
        <p className="text-muted-foreground">
          Voice Gecko is free and open source. Support is optional.
        </p>
      </div>

      <AlertBanner
        message={alertState.message}
        onClose={hideAlert}
        show={alertState.show}
        title={alertState.title}
        variant={alertState.variant}
      />

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = getCurrentPlanStatus(plan.id) === 'current';

          return (
            <PlanCard
              isCurrent={isCurrent}
              isLoading={isUpgrading && plan.stripeId === 'voice gecko pro'}
              isYearly={false}
              key={plan.name}
              onPlanClick={handlePlanClick}
              plan={plan}
              subscription={subscription}
            />
          );
        })}
      </div>
    </div>
  );
}
