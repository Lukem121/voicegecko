import { eq } from '@acme/db';
import { db } from '@acme/db/client';
import { subscription as SubscriptionTable } from '@acme/db/schema';
import { sendPaymentFailedEmail } from '@acme/email/send/payment-failed';
import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';

import { paymentEnv } from '../../env';
import { getUserForEmail, type UserForEmail } from './user-lookup';

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

  // Check if this update indicates a payment failure
  const isPaymentFailure =
    subscription.status === 'past_due' || subscription.status === 'unpaid';

  // Get user information for both email and Discord notification
  let user: UserForEmail | null = null;
  try {
    user = await getUserForEmail(subscription.referenceId);
  } catch (error) {
    log.error(error, '[Subscription] Error fetching user for notifications:');
  }

  if (isPaymentFailure) {
    log.info(
      `[Subscription] Payment failure detected for subscription ${subscription.id} with status: ${subscription.status}`
    );

    // Send payment failed email to the user
    try {
      if (user) {
        // Create retry payment URL - user can manage subscription through billing portal
        const retryPaymentUrl = `${paymentEnv().NEXT_PUBLIC_VOICEGECKO_URL || 'https://www.voicegecko.dev'}/app/billing`;
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
      log.error(error, '[Subscription] Error sending payment failed email:');
    }
  }

  // Send Discord notification for subscription update
  try {
    const discordAdapter = new DiscordAdapter();
    await discordAdapter.sendSubscriptionEvent({
      subscriptionId: subscription.id,
      eventType: 'updated',
      userId: subscription.referenceId,
      planName: subscription.plan || 'VoiceGecko Pro',
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
      additionalContext: isPaymentFailure
        ? { paymentFailure: true, failureType: subscription.status }
        : undefined,
      timestamp: new Date().toISOString(),
    });
    log.info(
      `[Subscription] Discord notification sent for updated subscription ${subscription.id}`
    );
  } catch (error) {
    log.error(error, '[Subscription] Error sending Discord notification:');
  }

  // Persist seats if present on subscription
  try {
    if (typeof subscription.seats === 'number') {
      await db
        .update(SubscriptionTable)
        .set({ seats: subscription.seats })
        .where(eq(SubscriptionTable.id, subscription.id));
      log.info('[Subscription] Seats updated', {
        subscriptionId: subscription.id,
        seats: subscription.seats,
      });
    }
  } catch (error) {
    log.error(error, '[Subscription] Error updating seats:');
  }

  // No special handling needed - our usage service already checks
  // subscription status and will automatically handle plan changes
  // - If upgraded to Pro: user gets unlimited immediately
  // - If downgraded to Free: user keeps current usage but is limited going forward
};
