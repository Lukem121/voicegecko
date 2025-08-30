import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';

/**
 * Formats a price with the appropriate currency formatting
 */
export const formatPrice = (price: PriceWithMetadata, currency: string) => {
  const currencyData =
    price.currencies[currency as keyof typeof price.currencies];
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyData.currency.toUpperCase(),
    minimumFractionDigits: currencyData.unitAmount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: currencyData.unitAmount % 100 === 0 ? 0 : 2,
  });
  return formatter.format(currencyData.unitAmount / 100); // Convert from cents
};

/**
 * Formats price as per-unit amount (for plans with minimum quantities)
 */
export const formatPricePerUnit = (
  price: PriceWithMetadata,
  currency: string
) => {
  const currencyData =
    price.currencies[currency as keyof typeof price.currencies];
  let unitAmount = currencyData.unitAmount;

  // If the price has a minimum quantity (like Teams plan with minimum 3 seats),
  // divide by that quantity to get per-unit price
  if (price.minimumQuantity && price.minimumQuantity > 1) {
    unitAmount /= price.minimumQuantity;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyData.currency.toUpperCase(),
    minimumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
  });
  return formatter.format(unitAmount / 100); // Convert from cents
};

/**
 * Formats yearly price as monthly equivalent
 */
export const formatYearlyAsMonthly = (
  price: PriceWithMetadata,
  currency: string,
  _planId: string
) => {
  const currencyData =
    price.currencies[currency as keyof typeof price.currencies];
  let monthlyAmount = currencyData.unitAmount / 12; // Divide yearly price by 12

  // If the price has a minimum quantity (like Teams plan with minimum 3 seats),
  // divide by that quantity to get per-unit monthly price
  if (price.minimumQuantity && price.minimumQuantity > 1) {
    monthlyAmount /= price.minimumQuantity;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyData.currency.toUpperCase(),
    minimumFractionDigits: monthlyAmount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: monthlyAmount % 100 === 0 ? 0 : 2,
  });
  return formatter.format(monthlyAmount / 100); // Convert from cents
};

/**
 * Finds the right price for a plan based on plan ID and interval
 */
export const findPriceForPlan = (
  prices: Record<string, PriceWithMetadata>,
  planId: string,
  interval: 'monthly' | 'yearly'
) => {
  // Find price that matches the plan name and interval type
  const matchingPriceEntry = Object.entries(prices).find(([_, price]) => {
    return price.planName === planId && price.intervalType === interval;
  });

  return matchingPriceEntry ? matchingPriceEntry[1] : null;
};

/**
 * Gets price display strings with fallbacks
 */
export const getPriceDisplay = (
  prices: Record<string, PriceWithMetadata>,
  options: {
    planId: string;
    interval: 'monthly' | 'yearly';
    currency: string;
    fallback: string;
  }
) => {
  const price = findPriceForPlan(prices, options.planId, options.interval);
  return price ? formatPrice(price, options.currency) : options.fallback;
};

/**
 * Gets per-unit price display (for plans with minimum quantities)
 */
export const getPerUnitPriceDisplay = (
  prices: Record<string, PriceWithMetadata>,
  options: {
    planId: string;
    interval: 'monthly' | 'yearly';
    currency: string;
    fallback: string;
  }
) => {
  const price = findPriceForPlan(prices, options.planId, options.interval);
  return price ? formatPricePerUnit(price, options.currency) : options.fallback;
};

/**
 * Gets yearly price display as monthly equivalent
 */
export const getYearlyPriceAsMonthly = (
  prices: Record<string, PriceWithMetadata>,
  planId: string,
  currency: string,
  fallback: string
) => {
  const price = findPriceForPlan(prices, planId, 'yearly');
  return price ? formatYearlyAsMonthly(price, currency, planId) : fallback;
};
