import { log } from '@acme/observability/log';
import { stripeClient } from '@acme/payment/stripe';
import { apiEnv } from '../../../env';

type PriceId = string;

export type Price = {
  id: string;
  currency: string;
  unitAmount: number;
  interval: string;
  intervalCount: number;
};

export type CurrencyPrice = {
  currency: string;
  unitAmount: number;
};

export interface PriceWithMetadata extends Price {
  planName?: string;
  intervalType?: 'monthly' | 'yearly';
  minimumQuantity?: number;
  currencies: {
    usd: CurrencyPrice;
    eur: CurrencyPrice;
    gbp: CurrencyPrice;
  };
}

// Map environment variables to plan metadata
const PRICE_METADATA = {
  [apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY]: {
    planName: 'voice gecko pro',
    intervalType: 'monthly' as const,
    minimumQuantity: 1,
  },
  [apiEnv().STRIPE_PRICE_ID_PRO_YEARLY]: {
    planName: 'voice gecko pro',
    intervalType: 'yearly' as const,
    minimumQuantity: 1,
  },
  [apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY]: {
    planName: 'voice gecko team',
    intervalType: 'monthly' as const,
    minimumQuantity: 3,
  },
  [apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY]: {
    planName: 'voice gecko team',
    intervalType: 'yearly' as const,
    minimumQuantity: 3,
  },
};

export const stripeService = {
  async getPrices(): Promise<Record<PriceId, PriceWithMetadata>> {
    const priceIds = [
      apiEnv().STRIPE_PRICE_ID_PRO_MONTHLY,
      apiEnv().STRIPE_PRICE_ID_PRO_YEARLY,
      apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY,
      apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY,
    ];

    const prices = await Promise.all(
      priceIds.map((id) =>
        stripeClient.prices.retrieve(id, {
          expand: ['currency_options'],
        })
      )
    );

    log.info('Retrieved Stripe prices', { prices });

    // Transform the data into a more usable format with metadata
    const priceData = prices.reduce(
      (acc, price) => {
        const metadata =
          PRICE_METADATA[price.id as keyof typeof PRICE_METADATA];

        // Extract currency options from Stripe price object
        const currencies = {
          usd: {
            currency: 'usd',
            unitAmount:
              price.currency_options?.usd?.unit_amount ??
              price.unit_amount ??
              0,
          },
          eur: {
            currency: 'eur',
            unitAmount: price.currency_options?.eur?.unit_amount ?? 0,
          },
          gbp: {
            currency: 'gbp',
            unitAmount: price.currency_options?.gbp?.unit_amount ?? 0,
          },
        };

        acc[price.id] = {
          id: price.id,
          currency: price.currency,
          unitAmount: price.unit_amount ?? 0,
          interval: price.recurring?.interval ?? 'month',
          intervalCount: price.recurring?.interval_count ?? 1,
          planName: metadata?.planName,
          intervalType: metadata?.intervalType,
          minimumQuantity: metadata?.minimumQuantity,
          currencies,
        };
        return acc;
      },
      {} as Record<PriceId, PriceWithMetadata>
    );

    return priceData;
  },
};
