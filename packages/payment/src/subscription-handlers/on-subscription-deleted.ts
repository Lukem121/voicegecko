import { gtmService } from '@acme/gtm/service';
import {
  createSubscriptionEvent,
  generateTransactionId,
} from '@acme/gtm/utils';
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

  // Track subscription deletion in Google Tag Manager
  try {
    const deletionEvent = createSubscriptionEvent({
      eventType: 'subscription_delete',
      transactionId: generateTransactionId(subscription.id),
      userId: subscription.referenceId,
      subscriptionStatus: 'deleted',
      planName: subscription.plan,
      customParameters: {
        deleted_at: new Date().toISOString(),
      },
    });

    const gtmResult = await gtmService.sendEvent(deletionEvent);

    if (gtmResult.success) {
      log.info(
        `[GTM] Subscription delete event sent successfully for ${subscription.id}`
      );
    } else {
      log.error(
        `[GTM] Failed to send subscription delete event for ${subscription.id}:`,
        gtmResult.error
      );
    }
  } catch (error) {
    log.error(
      `[GTM] Error tracking subscription deletion for ${subscription.id}:`,
      error
    );
  }

  // No special handling needed - when the subscription is deleted,
  // our usage service will no longer find an active subscription
  // and will automatically enforce the free tier limits (2,000 words/week)
};
