import type { StripePlan, Subscription } from "@better-auth/stripe";
import type { Stripe } from "stripe";

interface SubscriptionCompleteParams {
  event: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
  plan: StripePlan;
}

export const onSubscriptionComplete = async ({
  event,
  subscription,
  stripeSubscription,
  plan,
}: SubscriptionCompleteParams) => {
  console.log(`[Subscription] New subscription created:`, {
    subscriptionId: subscription.id,
    userId: subscription.id, // This is the user ID in BetterAuth
    plan: plan.name,
    status: subscription.status,
    periodStart: subscription.periodStart,
    periodEnd: subscription.periodEnd,
  });

  // No special handling needed - our usage service already checks
  // subscription status and will automatically grant unlimited access
};
