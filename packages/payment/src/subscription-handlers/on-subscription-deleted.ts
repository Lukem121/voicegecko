import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';

type SubscriptionDeletedParams = {
  event: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
};

export const onSubscriptionDeleted = async ({
  subscription,
}: SubscriptionDeletedParams) => {
  await Promise.resolve();

  log.info('[Subscription] Subscription deleted:', {
    subscriptionId: subscription.id,
    userId: subscription.referenceId,
    deletedAt: new Date().toISOString(),
  });

  // No special handling needed - when the subscription is deleted,
  // our usage service will no longer find an active subscription
  // and will automatically enforce the free tier limits (2,000 words/week)
};
