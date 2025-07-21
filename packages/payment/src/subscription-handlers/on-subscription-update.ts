import type { Subscription } from "@better-auth/stripe";
import type { Stripe } from "stripe";

interface SubscriptionUpdateParams {
  event: Stripe.Event;
  subscription: Subscription;
}

export const onSubscriptionUpdate = async ({
  event,
  subscription,
}: SubscriptionUpdateParams) => {
  console.log(`[Subscription] Subscription updated:`, {
    subscriptionId: subscription.id,
    userId: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    periodEnd: subscription.periodEnd,
  });

  // No special handling needed - our usage service already checks
  // subscription status and will automatically handle plan changes
  // - If upgraded to Pro: user gets unlimited immediately
  // - If downgraded to Free: user keeps current usage but is limited going forward
};
