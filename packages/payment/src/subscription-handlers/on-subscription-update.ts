import { sendPaymentFailedEmail } from '@acme/email/send/payment-failed';
import { gtmService } from '@acme/gtm/service';
import {
  createSubscriptionEvent,
  generateTransactionId,
} from '@acme/gtm/utils';
import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';

import { paymentEnv } from '../../env';
import { getUserForEmail } from './user-lookup';

type SubscriptionUpdateParams = {
  event: Stripe.Event;
  subscription: Subscription;
};

export const onSubscriptionUpdate = async ({
  subscription,
}: SubscriptionUpdateParams) => {
  log.info('[Subscription] Subscription updated:', {
    subscriptionId: subscription.id,
    userId: subscription.referenceId,
    plan: subscription.plan,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    periodEnd: subscription.periodEnd,
  });

  // Track subscription update in Google Tag Manager
  try {
    const updateEvent = createSubscriptionEvent({
      eventType: 'subscription_update',
      transactionId: generateTransactionId(subscription.id),
      userId: subscription.referenceId,
      subscriptionStatus: subscription.status,
      planName: subscription.plan,
      customParameters: {
        cancel_at_period_end: subscription.cancelAtPeriodEnd?.toString(),
        period_end: subscription.periodEnd?.toString(),
      },
    });

    const gtmResult = await gtmService.sendEvent(updateEvent);

    if (gtmResult.success) {
      log.info(
        `[GTM] Subscription update event sent successfully for ${subscription.id}`
      );
    } else {
      log.error(
        `[GTM] Failed to send subscription update event for ${subscription.id}:`,
        gtmResult.error
      );
    }
  } catch (error) {
    log.error(
      `[GTM] Error tracking subscription update for ${subscription.id}:`,
      error
    );
  }

  // Check if this update indicates a payment failure
  const isPaymentFailure =
    subscription.status === 'past_due' || subscription.status === 'unpaid';

  if (isPaymentFailure) {
    log.info(
      `[Subscription] Payment failure detected for subscription ${subscription.id} with status: ${subscription.status}`
    );

    // Send payment failed email to the user
    try {
      const user = await getUserForEmail(subscription.referenceId);
      if (user) {
        // Create retry payment URL - user can manage subscription through billing portal
        const retryPaymentUrl = `${paymentEnv().NEXT_PUBLIC_VOICEGECKO_URL || 'https://voicegecko.io'}/app/billing`;
        const accountUrl = retryPaymentUrl; // Same URL for account management

        await sendPaymentFailedEmail({
          user,
          planName: subscription.plan || 'VoiceGecko Pro',
          retryPaymentUrl,
          accountUrl,
        });
        log.info(
          `[Subscription] Payment failed email sent to user ${subscription.referenceId} for plan ${subscription.plan}`
        );
      } else {
        log.error(
          `[Subscription] Could not find user ${subscription.referenceId} to send payment failed email`
        );
      }
    } catch (error) {
      log.error('[Subscription] Error sending payment failed email:', error);
    }
  }

  // No special handling needed - our usage service already checks
  // subscription status and will automatically handle plan changes
  // - If upgraded to Pro: user gets unlimited immediately
  // - If downgraded to Free: user keeps current usage but is limited going forward
};
