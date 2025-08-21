import { sendWelcomeProEmail } from '@acme/email/send/welcome-pro';
import { log } from '@acme/observability/log';
import type { StripePlan, Subscription } from '@better-auth/stripe';
import type Stripe from 'stripe';
import { getUserForEmail, type UserForEmail } from './user-lookup';

type SubscriptionCompleteParams = {
  event: Stripe.Event;
  subscription: Subscription;
  stripeSubscription: Stripe.Subscription;
  plan: StripePlan;
};

export const onSubscriptionComplete = async ({
  subscription,
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
    log.error('[Subscription] Error sending welcome email:', error);
  }

  // No special handling needed - our usage service already checks
  // subscription status and will automatically grant unlimited access
};
