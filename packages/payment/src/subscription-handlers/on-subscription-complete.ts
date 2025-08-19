import { sendWelcomeProEmail } from '@acme/email/send/welcome-pro';
import { gtmService } from '@acme/gtm/service';
import {
  createPurchaseEvent,
  determinePlanType,
  formatCurrency,
  generateTransactionId,
} from '@acme/gtm/utils';
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
  stripeSubscription,
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

  // Track purchase conversion in Google Tag Manager
  try {
    // Get the actual price and currency from the Stripe subscription
    const stripePrice = stripeSubscription.items.data[0]?.price;
    if (stripePrice) {
      const purchaseEvent = createPurchaseEvent({
        transactionId: generateTransactionId(subscription.id),
        currency: formatCurrency(stripePrice.currency),
        value: stripePrice.unit_amount || 0,
        userId: subscription.referenceId,
        planName: plan.name,
        planType: determinePlanType(stripePrice.id, plan.name),
        priceId: stripePrice.id,
        // Enhanced Conversions data for Google Ads attribution
        userEmail: user?.email,
        customParameters: {
          subscription_id: subscription.id,
          subscription_status: subscription.status,
          period_start: subscription.periodStart?.toString() ?? '',
          period_end: subscription.periodEnd?.toString() ?? '',
        },
      });

      const gtmResult = await gtmService.sendEvent(purchaseEvent);

      if (gtmResult.success) {
        log.info(
          `[GTM] Purchase event with enhanced conversions sent successfully for subscription ${subscription.id}`
        );
      } else {
        log.error(
          `[GTM] Failed to send purchase event for subscription ${subscription.id}:`,
          gtmResult.error
        );
      }
    } else {
      log.warn(
        `[GTM] Could not find Stripe price information for subscription ${subscription.id}`
      );
    }
  } catch (error) {
    // Don't fail the entire process if GTM tracking fails
    log.error(
      `[GTM] Error tracking purchase for subscription ${subscription.id}:`,
      error
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
