import { sendSubscriptionCancelledEmail } from '@acme/email';
import { log } from '@acme/observability';
import type { Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';

import { paymentEnv } from '../../env';
import { getUserForEmail } from './user-lookup';

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
  log.info('[Subscription] Subscription cancelled:', {
    subscriptionId: subscription.id,
    userId: subscription.referenceId,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    periodEnd: subscription.periodEnd,
    cancellationReason: cancellationDetails?.reason,
    cancellationFeedback: cancellationDetails?.feedback,
  });

  // Send subscription cancelled email to the user
  try {
    const user = await getUserForEmail(subscription.referenceId);
    if (user && subscription.periodEnd) {
      const accessUntilDate = new Date(
        subscription.periodEnd
      ).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Create reactivate URL - user can manage subscription through billing portal
      const reactivateUrl = `${paymentEnv().NEXT_PUBLIC_VOICEGECKO_URL || 'https://voicegecko.io'}/app/billing`;

      await sendSubscriptionCancelledEmail({
        user,
        planName: 'VoiceGecko Pro',
        accessUntilDate,
        reactivateUrl,
      });
      log.info(
        `[Subscription] Cancellation email sent to user ${subscription.referenceId}`
      );
    } else {
      log.error(
        '[Subscription] Could not send cancellation email - missing user or periodEnd',
        {
          userId: subscription.referenceId,
          hasUser: !!user,
          hasPeriodEnd: !!subscription.periodEnd,
        }
      );
    }
  } catch (error) {
    log.error('[Subscription] Error sending cancellation email:', error);
  }

  // No special handling needed - the subscription remains active until periodEnd
  // Our usage service checks cancelAtPeriodEnd and still grants unlimited access
  // until the subscription actually expires
};
