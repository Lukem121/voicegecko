import { sendSubscriptionCancelledEmail } from '@acme/email/send/subscription-cancelled';
import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';

import { paymentEnv } from '../../env';
import {
  extractSubscriptionPricing,
  getUserForEmail,
  type UserForEmail,
} from './user-lookup';

type SubscriptionCancelParams = {
  event?: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
  cancellationDetails?: Stripe.Subscription.CancellationDetails | null;
};

export const onSubscriptionCancel = async ({
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

  // Get user information for both email and Discord notification
  let user: UserForEmail | null = null;
  try {
    user = await getUserForEmail(subscription.referenceId);
  } catch (error) {
    log.error(error, '[Subscription] Error fetching user for notifications:');
  }

  // Send subscription cancelled email to the user
  try {
    if (user && subscription.periodEnd) {
      const accessUntilDate = new Date(
        subscription.periodEnd
      ).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Create reactivate URL - user can manage subscription through billing portal
      const reactivateUrl = `${paymentEnv().NEXT_PUBLIC_VOICEGECKO_URL || 'https://www.voicegecko.io'}/app/billing`;

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
    log.error(error, '[Subscription] Error sending cancellation email:');
  }

  // Send Discord notification for subscription cancellation
  try {
    const discordAdapter = new DiscordAdapter();
    const pricing = extractSubscriptionPricing(stripeSubscription);

    await discordAdapter.sendSubscriptionEvent({
      subscriptionId: subscription.id,
      eventType: 'cancelled',
      userId: subscription.referenceId,
      planName: 'VoiceGecko Pro',
      status: subscription.status,
      email: user?.email,
      username: user?.name,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      periodEnd: subscription.periodEnd
        ? new Date(subscription.periodEnd).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : undefined,
      cancellationReason: cancellationDetails?.reason || undefined,
      cancellationFeedback: cancellationDetails?.feedback || undefined,
      // Add pricing information
      amount: pricing?.amount,
      currency: pricing?.currency,
      interval: pricing?.interval,
      intervalCount: pricing?.intervalCount,
      timestamp: new Date().toISOString(),
    });
    log.info(
      `[Subscription] Discord notification sent for cancelled subscription ${subscription.id}`
    );
  } catch (error) {
    log.error(error, '[Subscription] Error sending Discord notification:');
  }

  // No special handling needed - the subscription remains active until periodEnd
  // Our usage service checks cancelAtPeriodEnd and still grants unlimited access
  // until the subscription actually expires
};
