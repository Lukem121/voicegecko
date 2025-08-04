'use client';

import type { PriceWithMetadata } from '@acme/api/src/router/stripe.route';
import {
import
{
  log;
}
from;
('@acme/observability');
Alert,
  AlertDescription,
  AlertTitle,
} from '@acme/ui/components/ui/alert'

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { cn } from '@acme/ui/lib/utils';
import type { Subscription } from '@better-auth/stripe';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { StudentDiscountModal } from '~/components/student-discount-modal';
import { authClient } from '~/lib/auth/client';
import { useTRPC } from '~/trpc/react';
import { useCreateBillingPortalSession } from '../../_hooks/use-create-billing-portal-session';

type BillingPeriod = 'monthly' | 'annual';
type CellValue = 'check' | 'x' | (string & {});

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

interface ComparisonTableProps {
  firstColumnHeader: string;
  data: {
    feature: string;
    basic: CellValue;
    pro: CellValue;
  }[];
}

interface AlertState {
  show: boolean;
  variant: 'default' | 'destructive';
  title: string;
  message: string;
}

const ComparisonTable = ({ firstColumnHeader, data }: ComparisonTableProps) => {
  const renderCell = (value: CellValue) => {
    if (value === 'check') {
      return <Check className="mx-auto h-4 w-4 text-muted-foreground" />;
    }
    if (value === 'x') {
      return <X className="mx-auto h-4 w-4 text-red-500" />;
    }
    return (
      <span className="block text-center text-muted-foreground text-sm">
        {value}
      </span>
    );
  };

  return (
    <div className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b">
              <th className="w-1/3 px-4 py-3 text-left font-medium">
                {firstColumnHeader}
              </th>
              <th className="w-1/3 px-4 py-3 text-center font-medium">Basic</th>
              <th className="w-1/3 px-4 py-3 text-center font-medium">Pro</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr className="border-gray-100 border-b" key={index}>
                <td className="w-1/3 px-4 py-3 text-sm">{row.feature}</td>
                <td className="w-1/3 px-4 py-3">{renderCell(row.basic)}</td>
                <td className="w-1/3 px-4 py-3">{renderCell(row.pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Toggle = ({
  selected,
  setSelected,
}: {
  selected: BillingPeriod;
  setSelected: (period: BillingPeriod) => void;
}) => {
  const isYearly = selected === 'annual';
  return (
    <div className="flex justify-center">
      <div className="flex rounded-full border p-1">
        <button
          className={cn('relative z-0 px-4 py-2', isYearly ? 'z-1' : 'z-0')}
          onClick={() => setSelected('annual')}
        >
          {isYearly && (
            <motion.div
              className="absolute inset-0 rounded-full bg-neutral-900"
              initial={false}
              layoutId="toggleBackground"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span
            className={cn(
              'relative block font-medium text-xs',
              isYearly ? 'text-white' : 'text-muted-foreground',
              'duration-200'
            )}
          >
            Yearly
            <span className="ml-2 font-semibold text-[10px] text-green-500">
              <span className="hidden lg:inline">Save </span>
              <span className="lg:hidden">-</span>20%
            </span>
          </span>
        </button>
        <button
          className={cn('relative z-0 px-4 py-2', isYearly ? 'z-0' : 'z-1')}
          onClick={() => setSelected('monthly')}
        >
          {!isYearly && (
            <motion.div
              className="absolute inset-0 rounded-full bg-neutral-900"
              initial={false}
              layoutId="toggleBackground"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span
            className={cn(
              'relative block font-medium text-xs',
              isYearly ? 'text-muted-foreground' : 'text-white',
              'duration-200'
            )}
          >
            Monthly
          </span>
        </button>
      </div>
    </div>
  );
};

export default function Plans({ prices, subscription, error }: PlansProps) {
  const router = useRouter();
  const createBillingPortalSessionMutation = useCreateBillingPortalSession();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    variant: 'default',
    title: '',
    message: '',
  });
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const trpc = useTRPC();

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
    return (
      <div className="mx-auto max-w-5xl p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-medium text-3xl">Plans</h1>
          <p className="text-muted-foreground">
            Choose the plan that works for you
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Failed to Load Pricing Data</AlertTitle>
          <AlertDescription>
            {error.message ??
              `Failed to load pricing information (${error.status}: ${error.statusText})`}
          </AlertDescription>
        </Alert>

        <Card className="mt-8 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button onClick={() => router.push('/app')} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to format price with currency
  const formatPrice = (price: PriceWithMetadata) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(price.unitAmount / 100); // Convert from cents
  };

  // Helper to format price as per-unit amount (for plans with minimum quantities)
  const formatPricePerUnit = (price: PriceWithMetadata) => {
    let unitAmount = price.unitAmount;

    // If the price has a minimum quantity (like Teams plan with minimum 3 seats),
    // divide by that quantity to get per-unit price
    if (price.minimumQuantity && price.minimumQuantity > 1) {
      unitAmount = unitAmount / price.minimumQuantity;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(unitAmount / 100); // Convert from cents
  };

  // Helper to format yearly price as monthly equivalent
  const formatYearlyAsMonthly = (price: PriceWithMetadata, planId: string) => {
    let monthlyAmount = price.unitAmount / 12; // Divide yearly price by 12

    // If the price has a minimum quantity (like Teams plan with minimum 3 seats),
    // divide by that quantity to get per-unit monthly price
    if (price.minimumQuantity && price.minimumQuantity > 1) {
      monthlyAmount = monthlyAmount / price.minimumQuantity;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(monthlyAmount / 100); // Convert from cents
  };

  // Helper to find the right price for a plan
  const findPriceForPlan = (planId: string, interval: 'monthly' | 'yearly') => {
    // Find price that matches the plan name and interval type
    const matchingPriceEntry = Object.entries(prices).find(([_, price]) => {
      return price.planName === planId && price.intervalType === interval;
    });

    return matchingPriceEntry ? matchingPriceEntry[1] : null;
  };

  // Get price display strings with fallbacks
  const getPriceDisplay = (
    planId: string,
    interval: 'monthly' | 'yearly',
    fallback: string
  ) => {
    const price = findPriceForPlan(planId, interval);
    return price ? formatPrice(price) : fallback;
  };

  // Get per-unit price display (for plans with minimum quantities)
  const getPerUnitPriceDisplay = (
    planId: string,
    interval: 'monthly' | 'yearly',
    fallback: string
  ) => {
    const price = findPriceForPlan(planId, interval);
    return price ? formatPricePerUnit(price) : fallback;
  };

  // Get yearly price display as monthly equivalent
  const getYearlyPriceAsMonthly = (planId: string, fallback: string) => {
    const price = findPriceForPlan(planId, 'yearly');
    return price ? formatYearlyAsMonthly(price, planId) : fallback;
  };

  // Dynamic plans with prices from Stripe
  const plans = [
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
      variant: 'outline' as const,
    },
    {
      name: 'Pro',
      id: 'voice gecko pro',
      stripeId: 'voice gecko pro', // This matches the plan name in auth config
      monthlyPrice: getPriceDisplay('voice gecko pro', 'monthly', '$29'),
      yearlyMonthlyPrice: getYearlyPriceAsMonthly('voice gecko pro', '$24'),
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
      variant: 'outline' as const,
    },
  ];

  const handlePlanClick = async (plan: (typeof plans)[0]) => {
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
        const { error } = await authClient.subscription.upgrade({
          plan: plan.stripeId,
          successUrl: '/app/plans',
          cancelUrl: '/app/plans',
          annual: isYearly,
          // If user has an active subscription, provide the subscription ID for plan switching
          ...(subscription?.stripeSubscriptionId && {
            subscriptionId: subscription.stripeSubscriptionId,
          }),
        });

        if (error) {
          log.error('Subscription error:', error);
          showAlert(
            'Subscription Error',
            error.message ?? 'Failed to process subscription'
          );
        }
      }
    } catch (error) {
      log.error('Error handling plan:', error);
      showAlert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const getCurrentPlanStatus = (planId: string) => {
    if (!subscription && planId === 'basic') return 'current';
    if (subscription?.plan === planId) return 'current';
    return null;
  };

  const getButtonText = (plan: (typeof plans)[0]) => {
    const status = getCurrentPlanStatus(plan.id);
    if (status === 'current') return 'Current plan';
    if (plan.isFree && subscription) return 'Downgrade';
    return plan.cta;
  };

  const devicePlatformData = [
    {
      feature: 'Desktop Mac',
      basic: 'check' as const,
      pro: 'check' as const,
    },
    {
      feature: 'Desktop Windows',
      basic: 'check' as const,
      pro: 'check' as const,
    },
    {
      feature: 'iPhone',
      basic: 'Coming soon',
      pro: 'Coming soon',
    },
    {
      feature: 'Android',
      basic: 'Coming soon',
      pro: 'Coming soon',
    },
  ];

  const voiceTypingData = [
    {
      feature: 'Word Limit',
      basic: '2,000 a week',
      pro: 'Unlimited',
    },
    {
      feature: 'Add Words to Dictionary',
      basic: 'check' as const,
      pro: 'check' as const,
    },
    {
      feature: 'Prioritized Feature Requests',
      basic: 'x' as const,
      pro: 'check' as const,
    },
    {
      feature: 'Early Access to New Features',
      basic: 'x' as const,
      pro: 'check' as const,
    },
  ];

  const teamCollaborationData = [
    {
      feature: 'Customer Support',
      basic: 'Standard',
      pro: 'Prioritized',
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="">
          <h1 className="mb-2 font-medium text-3xl">Plans</h1>
          <p className="text-muted-foreground">
            Choose the plan that works for you
          </p>
        </div>
        {/* Billing Toggle */}
        <Toggle selected={billingPeriod} setSelected={setBillingPeriod} />
      </div>

      {/* Dynamic Alert */}
      {alertState.show && (
        <Alert className="mb-8" variant={alertState.variant}>
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

      {/* Plans */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = getCurrentPlanStatus(plan.id) === 'current';
          const isLoading = loadingPlan === plan.id;

          return (
            <Card
              className={cn(
                'flex h-full flex-col gap-0 border-0 shadow-sm,',
                isCurrent && 'ring-2 ring-primary'
              )}
              key={plan.name}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-medium text-lg">
                    {plan.name}
                  </CardTitle>
                  {isCurrent && (
                    <span className="font-medium text-primary text-xs">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  {plan.isFree ? (
                    <span className="font-bold text-2xl">Free</span>
                  ) : (
                    <>
                      <span className="font-bold text-2xl">
                        {isYearly ? plan.yearlyMonthlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {plan.subtitle}
                </p>
              </CardHeader>

              <CardContent className="flex-grow py-3">
                <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {plan.features.map((feature, index) => (
                    <li className="flex items-start gap-2" key={index}>
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="mt-auto pt-3">
                <Button
                  className="w-full"
                  disabled={isCurrent || isLoading}
                  onClick={() => handlePlanClick(plan)}
                  variant={plan.variant}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    getButtonText(plan)
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Student Discount Card */}
      <Card className="mb-12 border-0 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Student Discount</p>
            <p className="text-muted-foreground text-sm">
              Students get 50% off the Pro plan
            </p>
          </div>
          <Button onClick={() => setIsStudentModalOpen(true)} variant="outline">
            Get started
          </Button>
        </div>
      </Card>

      {/* Plans and Features */}
      <div className="mt-16">
        <div className="mb-12">
          <h2 className="mb-2 font-medium text-2xl">Plans and Features</h2>
          <p className="text-muted-foreground">
            Compare what's included in each plan
          </p>
        </div>

        <ComparisonTable
          data={devicePlatformData}
          firstColumnHeader="Device and Platform"
        />
        <ComparisonTable
          data={voiceTypingData}
          firstColumnHeader="Effortless Voice Typing"
        />
        <ComparisonTable
          data={teamCollaborationData}
          firstColumnHeader="Support"
        />
      </div>

      <StudentDiscountModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </div>
  );
}
