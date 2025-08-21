import { toast } from '@acme/ui/components/ui/sonner';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { authClient } from '~/lib/auth/client';
import { trackEvent } from '~/lib/gtm/client';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { useTRPC } from '~/trpc/react';
import { useCurrency } from '../providers/currency';
import { usePostHog } from './use-posthog';
import { usePaymentRedirection } from './use-redirection-nextjs';

export type SubscriptionPlan = 'voice gecko pro';

export type UseSubscriptionUpgradeOptions = {
  successUrl?: string;
  cancelUrl?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  subscriptionId?: string; // For plan switching on existing subscriptions
};

export type UseSubscriptionUpgradeReturn = {
  upgrade: (plan: SubscriptionPlan, isAnnual?: boolean) => Promise<void>;
  isUpgrading: boolean;
  error: Error | null;
  clearError: () => void;
};

/**
 * Hook for managing subscription upgrades with proper error handling,
 * loading states, and user feedback
 */
export function useSubscriptionUpgrade(
  options: UseSubscriptionUpgradeOptions = {}
): UseSubscriptionUpgradeReturn {
  const trpc = useTRPC();
  const { currency } = useCurrency();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { trackEvent: trackPostHogEvent } = usePostHog();
  const paymentRedirection = usePaymentRedirection();

  const [purchaseSuccess] = useQueryState('sub_success', parseAsBoolean);

  const recentPurchase = useQuery(
    trpc.stripe.getRecentPurchase.queryOptions(undefined, {
      enabled: !!purchaseSuccess,
    })
  );

  const purchase = recentPurchase.data;

  const {
    successUrl: optionsSuccessUrl = '/app/plans?sub_success=true',
    cancelUrl: optionsCancelUrl = '/app/plans',
    onSuccess,
    onError,
    subscriptionId,
  } = options;

  // Handle purchase tracking when returning from Stripe
  // biome-ignore lint/correctness/useExhaustiveDependencies: no need to re-run
  useEffect(() => {
    if (purchaseSuccess && purchase) {
      trackEvent({
        event: 'purchase',
        transaction_id: purchase.transactionId,
        value: purchase.value,
        currency: purchase.currency,
        user_id: purchase.userId,
        email_address: purchase.email,
        items: [
          {
            item_id: 'pro_monthly',
            item_name: 'VoiceGecko Pro',
            item_category: 'subscription',
            item_variant: purchase.billingPeriod,
            price: purchase.value,
            quantity: 1,
          },
        ],
        plan_type: 'pro',
        billing_period: purchase.billingPeriod,
        timestamp: new Date().toISOString(),
      });

      // PostHog tracking
      trackPostHogEvent({
        event: 'purchase',
        transaction_id: purchase.transactionId,
        value: purchase.value,
        currency: purchase.currency,
        user_id: purchase.userId,
        plan_type: 'pro',
        billing_period: purchase.billingPeriod,
        source: POSTHOG_SOURCES.PLANS_PAGE,
        timestamp: new Date().toISOString(),
      });

      // Clean up URL parameter
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('sub_success');
      router.replace(cleanUrl.pathname + cleanUrl.search);

      onSuccess?.();
    }
  }, [purchaseSuccess, purchase]);

  // Handle payment success redirect with preserved intent
  useEffect(() => {
    if (purchaseSuccess) {
      // Small delay to ensure tracking is complete
      setTimeout(() => {
        paymentRedirection.handlePaymentSuccess();
      }, 100);
    }
  }, [purchaseSuccess, paymentRedirection]);

  // Helper function to track begin checkout event
  const trackBeginCheckout = (isAnnual: boolean) => {
    trackEvent({
      event: 'begin_checkout',
      timestamp: new Date().toISOString(),
      plan_type: 'pro' as const,
      billing_period: isAnnual ? ('yearly' as const) : ('monthly' as const),
      value: 0, // We'll get the real value after purchase
      currency,
    });

    // PostHog tracking
    trackPostHogEvent({
      event: 'begin_checkout',
      plan_type: 'pro',
      billing_period: isAnnual ? 'yearly' : 'monthly',
      value: 0,
      currency,
      source: POSTHOG_SOURCES.PLANS_PAGE,
      timestamp: new Date().toISOString(),
    });
  };

  const upgrade = async (plan: SubscriptionPlan, isAnnual = false) => {
    try {
      setIsUpgrading(true);
      setError(null);

      trackBeginCheckout(isAnnual);

      // Create dynamic success/cancel URLs that preserve user intent
      const { successUrl, cancelUrl } = paymentRedirection.createPaymentUrls(
        optionsSuccessUrl,
        optionsCancelUrl,
        true // Always preserve intent for upgrades
      );

      // Show loading toast
      const loadingToast = toast.loading('Processing your upgrade...');

      const { error: upgradeError } = await authClient.subscription.upgrade({
        plan,
        successUrl,
        cancelUrl,
        annual: isAnnual,
        // If subscriptionId is provided, include it for plan switching
        ...(subscriptionId && { subscriptionId }),
        fetchOptions: {
          headers: {
            'x-currency': currency,
          },
        },
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (upgradeError) {
        const errorMessage =
          upgradeError.message ?? 'Failed to process upgrade';
        const errorObj = new Error(errorMessage);

        setError(errorObj);
        onError?.(errorObj);

        toast.error('Upgrade Failed', {
          description: errorMessage,
          action: {
            label: 'Try Again',
            onClick: () => upgrade(plan, isAnnual),
          },
        });

        return;
      }

      // Success case - the user will be redirected to Stripe
      // This success callback likely won't run due to redirect
      onSuccess?.();
      toast.success('Redirecting to secure checkout...');
    } catch (unknownError) {
      const errorMessage =
        unknownError instanceof Error
          ? unknownError.message
          : 'An unexpected error occurred';

      const catchError = new Error(errorMessage);
      setError(catchError);
      onError?.(catchError);

      toast.error('Upgrade Failed', {
        description:
          'Please try again or contact support if the problem persists.',
        action: {
          label: 'Download App',
          onClick: () => router.push('/download?plan=pro'),
        },
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    upgrade,
    isUpgrading,
    error,
    clearError,
  };
}
