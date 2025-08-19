import { createHash } from 'node:crypto';
import type { GTMItem, GTMPurchaseEvent, GTMSubscriptionEvent } from './types';

export type CreatePurchaseEventParams = {
  transactionId: string;
  currency: string;
  value: number;
  userId?: string;
  planName: string;
  planType: 'monthly' | 'yearly';
  priceId: string;
  customParameters?: Record<string, string | number | boolean>;
  /** Enhanced Conversions user data for Google Ads attribution */
  userEmail?: string;
  userPhone?: string;
  userFirstName?: string;
  userLastName?: string;
  userAddress?: {
    street?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
};

export type CreateSubscriptionEventParams = {
  eventType:
    | 'subscription_cancel'
    | 'subscription_update'
    | 'subscription_delete';
  transactionId: string;
  userId?: string;
  subscriptionStatus: string;
  planName?: string;
  currency?: string;
  value?: number;
  customParameters?: Record<
    string,
    string | number | boolean | undefined | null
  >;
};

/**
 * Hash a string using SHA256 for Enhanced Conversions
 */
export function hashSHA256(input: string): string {
  return createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
}

/**
 * Creates a properly structured purchase event for GTM Enhanced Ecommerce
 */
export function createPurchaseEvent(
  params: CreatePurchaseEventParams
): GTMPurchaseEvent {
  const {
    transactionId,
    currency,
    value,
    userId,
    planName,
    planType,
    priceId,
    customParameters = {},
    userEmail,
    userPhone,
    userFirstName,
    userLastName,
    userAddress,
  } = params;

  // Convert value from cents to dollars for GA4
  const valueInDollars = value / 100;

  const item: GTMItem = {
    item_id: priceId,
    item_name: planName,
    item_category: 'Subscription',
    item_category2: planType,
    item_brand: 'VoiceGecko',
    item_variant: planType,
    currency: currency.toLowerCase(),
    price: valueInDollars,
    quantity: 1,
  };

  // Create Enhanced Conversions user data if email is provided
  const user_data = userEmail
    ? {
        email_address: hashSHA256(userEmail),
        ...(userPhone && { phone_number: hashSHA256(userPhone) }),
        ...((userFirstName || userLastName || userAddress) && {
          address: {
            ...(userFirstName && { first_name: hashSHA256(userFirstName) }),
            ...(userLastName && { last_name: hashSHA256(userLastName) }),
            ...userAddress,
          },
        }),
      }
    : undefined;

  return {
    event: 'purchase',
    currency: currency.toLowerCase(),
    value: valueInDollars,
    transaction_id: transactionId,
    items: [item],
    user_id: userId,
    user_data,
    custom_parameters: {
      plan_name: planName,
      plan_type: planType,
      price_id: priceId,
      ...customParameters,
    },
  };
}

/**
 * Creates a subscription event (cancel, update, delete) for GTM
 */
export function createSubscriptionEvent(
  params: CreateSubscriptionEventParams
): GTMSubscriptionEvent {
  const {
    eventType,
    transactionId,
    userId,
    subscriptionStatus,
    planName,
    currency,
    value,
    customParameters = {},
  } = params;

  return {
    event: eventType,
    currency: currency?.toLowerCase(),
    value: value ? value / 100 : undefined, // Convert from cents to dollars
    transaction_id: transactionId,
    user_id: userId,
    subscription_status: subscriptionStatus,
    plan_name: planName,
    custom_parameters: {
      subscription_status: subscriptionStatus,
      ...(planName && { plan_name: planName }),
      ...customParameters,
    },
  };
}

/**
 * Utility to determine plan type from price ID or plan name
 */
export function determinePlanType(
  priceId: string,
  planName?: string
): 'monthly' | 'yearly' {
  if (priceId.includes('yearly') || priceId.includes('annual')) {
    return 'yearly';
  }
  if (priceId.includes('monthly') || priceId.includes('month')) {
    return 'monthly';
  }
  if (planName?.toLowerCase().includes('year')) {
    return 'yearly';
  }
  return 'monthly'; // default fallback
}

/**
 * Utility to format currency code consistently
 */
export function formatCurrency(currency: string): string {
  return currency.toUpperCase();
}

/**
 * Utility to generate transaction ID from subscription ID
 */
export function generateTransactionId(subscriptionId: string): string {
  return `sub_${subscriptionId}`;
}
