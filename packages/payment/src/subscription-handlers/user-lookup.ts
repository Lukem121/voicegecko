import { db } from '@acme/db/client';
import { user as UserTable } from '@acme/db/schema';
import { log } from '@acme/observability/log';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export type UserForEmail = {
  email: string;
  name?: string;
};

/**
 * Fetches user details needed for sending emails
 */
export async function getUserForEmail(
  userId: string
): Promise<UserForEmail | null> {
  try {
    const [userRecord] = await db
      .select({
        email: UserTable.email,
        name: UserTable.name,
      })
      .from(UserTable)
      .where(eq(UserTable.id, userId))
      .limit(1);

    if (!userRecord) {
      log.error(`[Email] User not found for userId: ${userId}`);
      return null;
    }

    return {
      email: userRecord.email,
      name: userRecord.name || undefined,
    };
  } catch (error) {
    log.error(error, '[Email] Error fetching user for email:');
    return null;
  }
}

/**
 * Extracts pricing information from Stripe subscription
 */
export function extractSubscriptionPricing(
  stripeSubscription: Stripe.Subscription
): {
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
} | null {
  try {
    const firstItem = stripeSubscription.items.data[0];
    if (!firstItem?.price) {
      return null;
    }

    const { price } = firstItem;
    if (!price.unit_amount) {
      return null;
    }
    if (!price.recurring) {
      return null;
    }

    // Only show month/year intervals for simplicity
    const isValidInterval =
      price.recurring.interval === 'month' ||
      price.recurring.interval === 'year';
    if (!isValidInterval) {
      return null;
    }

    return {
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring.interval as 'month' | 'year',
      intervalCount: price.recurring.interval_count,
    };
  } catch (error) {
    log.error(error, '[Subscription] Error extracting pricing info:');
    return null;
  }
}
