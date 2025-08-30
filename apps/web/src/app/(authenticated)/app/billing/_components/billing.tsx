'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability/log';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@acme/ui/components/ui/alert';

import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import type { Subscription } from '@better-auth/stripe';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DesktopRedirectHandler } from '~/components/desktop-redirect-handler';
import { useCurrency } from '~/providers/currency';
import { useTRPC } from '~/trpc/react';
import { useCreateBillingPortalSession } from '../../_hooks/use-create-billing-portal-session';

type BillingProps = {
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

const useRestoreSubscription = () => {
  const trpc = useTRPC();
  const options = trpc.stripe.restoreSubscription.mutationOptions();
  const mutation = useMutation(options);
  return mutation;
};

// Helper function to determine subscription status
const getSubscriptionStatus = (
  subscription: Subscription | null,
  isCanceling: boolean
) => {
  if (!subscription) {
    return 'Free';
  }
  if (subscription.status === 'trialing') {
    return 'Trial';
  }
  if (isCanceling) {
    return 'Canceling';
  }
  return 'Active';
};

// Helper function to determine badge variant
const getBadgeVariant = (isCanceling: boolean): 'destructive' | 'secondary' => {
  return isCanceling ? 'destructive' : 'secondary';
};

// Error state component
function BillingErrorState({
  error,
  onRetry,
  onViewPlans,
}: {
  error: BillingProps['error'];
  onRetry: () => void;
  onViewPlans: () => void;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Handle desktop app redirects for cross-platform flows */}
      <DesktopRedirectHandler
        onNoRedirectNeeded={() =>
          log.info('ℹ️ No desktop redirect needed for billing')
        }
        onRedirectFailed={() =>
          log.warn('⚠️ Desktop billing redirect failed, staying on web')
        }
        onRedirectStart={() =>
          log.info('🔄 Redirecting back to desktop app from billing...')
        }
      />

      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Failed to Load Subscription Data</AlertTitle>
        <AlertDescription>
          {error.message ??
            `Failed to load subscription information (${error.status}: ${error.statusText})`}
        </AlertDescription>
      </Alert>

      <Card className="">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3">
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={onViewPlans} variant="outline">
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Current plan card component
function CurrentPlanCard({
  subscription,
  isLoading,
  isCanceling,
  onManageSubscription,
  onUpgradePlan,
  getCurrentSubscriptionPrice,
  getPlanDisplayName,
  formatDate,
}: {
  subscription: Subscription | null;
  isLoading: boolean;
  isCanceling: boolean;
  onManageSubscription: () => void;
  onUpgradePlan: () => void;
  getCurrentSubscriptionPrice: () => string;
  getPlanDisplayName: (planName: string) => string;
  formatDate: (date: Date | string | undefined) => string;
}) {
  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="mb-2 font-semibold text-xl">
            Current Plan
          </CardTitle>
          <CardAction>
            {subscription ? (
              <Button
                className="w-44"
                disabled={isLoading}
                onClick={onManageSubscription}
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            ) : (
              <Button
                className="w-44"
                onClick={onUpgradePlan}
                variant="outline"
              >
                Upgrade Plan
              </Button>
            )}
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {subscription ? (
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-lg">
              {getPlanDisplayName(subscription.plan)}
            </h3>
            <Badge variant={getBadgeVariant(isCanceling)}>
              {getSubscriptionStatus(subscription, isCanceling)}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-lg">Free Plan</h3>
            <Badge variant="secondary">Active</Badge>
          </div>
        )}
        {subscription ? (
          <p className="text-muted-foreground text-sm">
            {getCurrentSubscriptionPrice()} •
            {isCanceling
              ? ` Cancels on ${formatDate(subscription.periodEnd)}`
              : ` Next billing date: ${formatDate(subscription.periodEnd)}`}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            You're on the free plan with limited features
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Billing({ prices, subscription, error }: BillingProps) {
  const router = useRouter();
  const { currency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    variant: 'default',
    title: '',
    message: '',
  });

  const createBillingPortalSessionMutation = useCreateBillingPortalSession();
  const restoreSubscriptionMutation = useRestoreSubscription();

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

  // Helper to format price with currency
  const formatPrice = (price: PriceWithMetadata) => {
    const currencyData = price.currencies[currency];
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyData.currency.toUpperCase(),
      minimumFractionDigits: currencyData.unitAmount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: currencyData.unitAmount % 100 === 0 ? 0 : 2,
    });
    return formatter.format(currencyData.unitAmount / 100); // Convert from cents
  };

  // Helper to find the right price for a plan
  const findPriceForPlan = (
    planName: string,
    interval: 'monthly' | 'yearly'
  ) => {
    // Find price that matches the plan name and interval type
    const matchingPriceEntry = Object.entries(prices).find(([_, price]) => {
      return price.planName === planName && price.intervalType === interval;
    });

    return matchingPriceEntry ? matchingPriceEntry[1] : null;
  };

  // Determine the current subscription interval
  const getSubscriptionInterval = (): 'monthly' | 'yearly' => {
    if (!(subscription?.periodStart && subscription.periodEnd)) {
      return 'monthly';
    }

    const start = new Date(subscription.periodStart);
    const end = new Date(subscription.periodEnd);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    // More than 300 days = yearly subscription
    return daysDiff > 300 ? 'yearly' : 'monthly';
  };

  // Get the display price for the current subscription
  const getCurrentSubscriptionPrice = () => {
    if (!subscription) {
      return 'N/A';
    }

    const interval = getSubscriptionInterval();
    const price = findPriceForPlan(subscription.plan, interval);

    if (!price) {
      return 'Price unavailable';
    }

    return `${formatPrice(price)}/${interval === 'yearly' ? 'year' : 'month'}`;
  };

  // Handle error state
  if (error) {
    return (
      <BillingErrorState
        error={error}
        onRetry={() => router.refresh()}
        onViewPlans={() => router.push('/app/plans')}
      />
    );
  }

  const handleManageSubscription = async () => {
    if (!subscription) {
      router.push('/app/plans');
      return;
    }

    try {
      setIsLoading(true);
      const result = await createBillingPortalSessionMutation.mutateAsync({
        returnUrl: '/app/billing',
      });

      if (result.url) {
        router.push(result.url);
      }
    } catch (unknownError) {
      log.error('Error managing subscription:', unknownError);
      showAlert('Billing Portal Error', 'Failed to open billing portal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSubscription = async () => {
    if (!subscription?.stripeSubscriptionId) {
      return;
    }

    try {
      setIsRestoring(true);
      const result = await restoreSubscriptionMutation.mutateAsync({
        subscriptionId: subscription.stripeSubscriptionId,
      });

      if (result.success) {
        showAlert(
          'Subscription Restored',
          'Your subscription has been successfully restored and will continue as normal.',
          'default'
        );
        // Refresh after a short delay to show the success message
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (unknownError) {
      log.error('Error restoring subscription:', unknownError);
      showAlert(
        'Restore Failed',
        'Failed to restore subscription. Please try again.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) {
      return 'N/A';
    }
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanDisplayName = (planName: string) => {
    const displayNames: Record<string, string> = {
      'voice gecko pro': 'Voice Gecko Pro',
      'voice gecko team': 'Voice Gecko Team',
    };
    return displayNames[planName] ?? planName;
  };

  const isCanceling = subscription?.cancelAtPeriodEnd ?? false;
  const canRestore =
    subscription && isCanceling && subscription.status === 'active';

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Dynamic Alert */}
      {alertState.show && (
        <Alert variant={alertState.variant}>
          <AlertTriangle />
          <AlertTitle className="flex items-center justify-between">
            {alertState.title}
            <Button
              className="h-auto p-1"
              onClick={hideAlert}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>{alertState.message}</AlertDescription>
        </Alert>
      )}

      {/* Cancellation Alert with Restore Option */}
      {isCanceling && subscription && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Subscription Ending</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Your subscription will end on {formatDate(subscription.periodEnd)}
              . You can restore your subscription anytime before this date to
              continue your service.
            </p>
            {canRestore && (
              <Button
                className="mt-2"
                disabled={isRestoring}
                onClick={handleRestoreSubscription}
                size="sm"
                variant="outline"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restore Subscription
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <CurrentPlanCard
        formatDate={formatDate}
        getCurrentSubscriptionPrice={getCurrentSubscriptionPrice}
        getPlanDisplayName={getPlanDisplayName}
        isCanceling={isCanceling}
        isLoading={isLoading}
        onManageSubscription={handleManageSubscription}
        onUpgradePlan={() => router.push('/app/plans')}
        subscription={subscription}
      />

      {/* Subscription Details */}
      {subscription && (
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-semibold text-lg">
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-20 gap-y-3 md:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                <span className="font-medium text-sm">
                  {getSubscriptionStatus(subscription, isCanceling)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Billing Period
                </span>
                <span className="font-medium text-sm capitalize">
                  {getSubscriptionInterval()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Current period start
                </span>
                <span className="font-medium text-sm">
                  {formatDate(subscription.periodStart)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Current period end
                </span>
                <span className="font-medium text-sm">
                  {formatDate(subscription.periodEnd)}
                </span>
              </div>
              {subscription.seats !== undefined && subscription.seats > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Seats</span>
                  <span className="font-medium text-sm">
                    {subscription.seats}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History Note */}
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            To view your billing history, download invoices, or update payment
            methods, click "Manage Subscription" above to access the Stripe
            billing portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
