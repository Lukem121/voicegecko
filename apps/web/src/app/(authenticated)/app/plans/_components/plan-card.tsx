import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { cn } from '@acme/ui/lib/utils';
import { Check, Loader2 } from 'lucide-react';

/** Compatible with both EffectiveSubscription and @better-auth Subscription */
export type PlansSubscription = {
  cancelAtPeriodEnd?: boolean | null;
  id: string;
  plan: string | null;
  periodEnd?: Date | string | null;
  periodStart?: Date | string | null;
  seats?: number | null;
  status: string | null;
  stripeSubscriptionId?: string | null;
} | null;

export type Plan = {
  name: string;
  id: string;
  stripeId: string | null;
  monthlyPrice: string;
  yearlyMonthlyPrice: string;
  subtitle: string;
  features: string[];
  cta: string;
  variant: 'outline' | 'default';
};

type PlanCardProps = {
  plan: Plan;
  isYearly: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  subscription: PlansSubscription;
  onPlanClick: (plan: Plan) => void;
};

export const PlanCard = ({
  plan,
  isYearly,
  isCurrent,
  isLoading,
  subscription,
  onPlanClick,
}: PlanCardProps) => {
  const getButtonText = () => {
    if (isCurrent) {
      return 'Current plan';
    }
    return plan.cta;
  };

  return (
    <Card
      className={cn(
        'flex h-full flex-col gap-0',
        isCurrent && 'ring-2 ring-primary'
      )}
      key={plan.name}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold text-lg">{plan.name}</CardTitle>
          {isCurrent && (
            <span className="font-medium text-primary text-xs">Current</span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
              <span className="font-bold text-2xl">
                {isYearly ? plan.yearlyMonthlyPrice : plan.monthlyPrice}
              </span>
              <span className="text-muted-foreground text-sm">/mo</span>
        </div>
        <p className="mt-1 text-muted-foreground text-xs">{plan.subtitle}</p>
      </CardHeader>

      <CardContent className="flex-grow py-3">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {plan.features.map((feature) => (
            <li
              className="flex items-start gap-2"
              key={`${feature}-${plan.id}`}
            >
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
          onClick={() => onPlanClick(plan)}
          variant={plan.variant}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            getButtonText()
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
