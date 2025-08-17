import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';

export type SupportedCurrency = 'usd' | 'eur' | 'gbp';

export function formatPriceForCurrency(
  price: PriceWithMetadata,
  currencyCode: SupportedCurrency
): string {
  if (!price?.currencies) {
    return '$0';
  }
  const currencyData = price.currencies[currencyCode];
  if (!currencyData) {
    return '$0';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyData.currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(currencyData.unitAmount / 100);
}

export function formatYearlyAsMonthlyForCurrency(
  price: PriceWithMetadata,
  currencyCode: SupportedCurrency
): string {
  if (!price?.currencies) {
    return '$0';
  }
  const currencyData = price.currencies[currencyCode];
  if (!currencyData) {
    return '$0';
  }
  const monthlyAmount = currencyData.unitAmount / 12;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyData.currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(monthlyAmount / 100);
}

export function findPriceForPlanIn(
  prices: Record<string, PriceWithMetadata> | null,
  planId: string,
  interval: 'monthly' | 'yearly'
): PriceWithMetadata | null {
  if (!prices) {
    return null;
  }
  const match = Object.entries(prices).find(
    ([, price]) => price.planName === planId && price.intervalType === interval
  );
  return match ? match[1] : null;
}

export function getPriceDisplayFor(
  prices: Record<string, PriceWithMetadata> | null,
  options: {
    currencyCode: SupportedCurrency;
    planId: string;
    interval: 'monthly' | 'yearly';
    fallback: string;
  }
): string {
  const price = findPriceForPlanIn(prices, options.planId, options.interval);
  if (price) {
    return formatPriceForCurrency(price, options.currencyCode);
  }
  return options.fallback;
}

export function getYearlyPriceAsMonthlyFor(
  prices: Record<string, PriceWithMetadata> | null,
  currencyCode: SupportedCurrency,
  planId: string,
  fallback: string
): string {
  const price = findPriceForPlanIn(prices, planId, 'yearly');
  if (price) {
    return formatYearlyAsMonthlyForCurrency(price, currencyCode);
  }
  return fallback;
}
