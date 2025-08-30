import { sendWelcomeProEmail } from '@acme/email/send/welcome-pro';
import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { log } from '@acme/observability/log';
import type { StripePlan, Subscription } from '@better-auth/stripe';
import type Stripe from 'stripe';
import {
  extractSubscriptionPricing,
  getUserForEmail,
  type UserForEmail,
} from './user-lookup';

type SubscriptionCompleteParams = {
  event: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
  plan: StripePlan;
};

export const onSubscriptionComplete = async ({
  subscription,
  stripeSubscription,
  plan,
}: SubscriptionCompleteParams) => {
  log.info('[Subscription] New subscription created:', {
    subscriptionId: subscription.id,
    userId: subscription.referenceId, // This is the user ID in BetterAuth
    plan: plan.name,
    status: subscription.status,
    periodStart: subscription.periodStart,
    periodEnd: subscription.periodEnd,
  });

  // Get user data for Enhanced Conversions
  let user: UserForEmail | null = null;
  try {
    user = await getUserForEmail(subscription.referenceId);
  } catch {
    log.warn(
      `[GTM] Could not find user ${subscription.referenceId} for enhanced conversions`
    );
  }

  // Send welcome pro email to the user
  try {
    // Reuse the user we already fetched, or fetch again if needed
    if (!user) {
      user = await getUserForEmail(subscription.referenceId);
    }

    if (user) {
      await sendWelcomeProEmail({
        user,
        planName: plan.name,
      });
      log.info(
        `[Subscription] Welcome email sent to user ${subscription.referenceId} for plan ${plan.name}`
      );
    } else {
      log.error(
        `[Subscription] Could not find user ${subscription.referenceId} to send welcome email`
      );
    }
  } catch (error) {
    log.error(error, '[Subscription] Error sending welcome email:');
  }

  // Send Discord notification for new subscription
  try {
    const discordAdapter = new DiscordAdapter();
    const pricing = extractSubscriptionPricing(stripeSubscription);

    await discordAdapter.sendSubscriptionEvent({
      subscriptionId: subscription.id,
      eventType: 'created',
      userId: subscription.referenceId,
      planName: plan.name,
      status: subscription.status,
      email: user?.email,
      username: user?.name,
      periodStart: subscription.periodStart
        ? new Date(subscription.periodStart).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : undefined,
      periodEnd: subscription.periodEnd
        ? new Date(subscription.periodEnd).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : undefined,
      // Add pricing information
      amount: pricing?.amount,
      currency: pricing?.currency,
      interval: pricing?.interval,
      intervalCount: pricing?.intervalCount,
      timestamp: new Date().toISOString(),
    });
    log.info(
      `[Subscription] Discord notification sent for new subscription ${subscription.id}`
    );
  } catch (error) {
    log.error(error, '[Subscription] Error sending Discord notification:');
  }

  // No special handling needed - our usage service already checks
  // subscription status and will automatically grant unlimited access
};
