import type { Subscription } from "@better-auth/stripe";
import type { Stripe } from "stripe";

interface SubscriptionCancelParams {
  event?: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
  cancellationDetails?: Stripe.Subscription.CancellationDetails | null;
}

export const onSubscriptionCancel = async ({
  event,
  subscription,
  stripeSubscription,
  cancellationDetails,
}: SubscriptionCancelParams) => {
  console.log(`[Subscription] Subscription cancelled:`, {
    subscriptionId: subscription.id,
    userId: subscription.id,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    periodEnd: subscription.periodEnd,
    cancellationReason: cancellationDetails?.reason,
    cancellationFeedback: cancellationDetails?.feedback,
  });

  // No special handling needed - the subscription remains active until periodEnd
  // Our usage service checks cancelAtPeriodEnd and still grants unlimited access
  // until the subscription actually expires
};
