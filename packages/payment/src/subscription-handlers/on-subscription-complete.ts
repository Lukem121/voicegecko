import { sendWelcomeProEmail } from '@acme/email/send/welcome-pro';
import { log } from '@acme/observability/log';
import type { StripePlan, Subscription } from '@better-auth/stripe';
import type { Stripe } from 'stripe';

import { getUserForEmail } from './user-lookup';

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

  // Send welcome pro email to the user
  try {
    const user = await getUserForEmail(subscription.referenceId);
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
