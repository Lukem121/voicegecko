import { toast } from '@acme/ui/components/ui/sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '~/lib/auth/client';
import { useCurrency } from '../providers/currency';

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
  const { currency } = useCurrency();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    successUrl = '/app/plans',
    cancelUrl = '/app/plans',
    onSuccess,
    onError,
    subscriptionId,
  } = options;

  const upgrade = async (plan: SubscriptionPlan, isAnnual = false) => {
    try {
      setIsUpgrading(true);
      setError(null);

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
