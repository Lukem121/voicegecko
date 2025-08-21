import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { log } from '@acme/observability/log';
import type { Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';
import {
  extractSubscriptionPricing,
  getUserForEmail,
  type UserForEmail,
} from './user-lookup';

type SubscriptionDeletedParams = {
  event: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
};

export const onSubscriptionDeleted = async ({
  subscription,
  stripeSubscription,
}: SubscriptionDeletedParams) => {
  log.info('[Subscription] Subscription deleted:', {
    subscriptionId: subscription.id,
    userId: subscription.referenceId,
    deletedAt: new Date().toISOString(),
  });

  // Get user information for Discord notification
  let user: UserForEmail | null = null;
  try {
    user = await getUserForEmail(subscription.referenceId);
  } catch (error) {
    log.error('[Subscription] Error fetching user for notification:', error);
  }

  // Send Discord notification for subscription deletion
  try {
    const discordAdapter = new DiscordAdapter();
    const pricing = extractSubscriptionPricing(stripeSubscription);

    await discordAdapter.sendSubscriptionEvent({
      subscriptionId: subscription.id,
      eventType: 'deleted',
      userId: subscription.referenceId,
      planName: subscription.plan || 'VoiceGecko Pro',
      status: subscription.status,
      email: user?.email,
      username: user?.name,
      // Add pricing information
      amount: pricing?.amount,
      currency: pricing?.currency,
      interval: pricing?.interval,
      intervalCount: pricing?.intervalCount,
      timestamp: new Date().toISOString(),
    });
    log.info(
      `[Subscription] Discord notification sent for deleted subscription ${subscription.id}`
    );
  } catch (error) {
    log.error('[Subscription] Error sending Discord notification:', error);
  }

  // No special handling needed - when the subscription is deleted,
  // our usage service will no longer find an active subscription
  // and will automatically enforce the free tier limits (2,000 words/week)
};
