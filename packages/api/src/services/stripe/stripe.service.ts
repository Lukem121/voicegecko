import { log } from '@acme/observability/log';
import { stripeClient } from '@acme/payment/stripe';
import type Stripe from 'stripe';
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

type PlanMeta = {
  planName: string;
  intervalType: 'monthly' | 'yearly';
  minimumQuantity: number;
};

function buildPriceMetadata(): Record<string, PlanMeta> {
  const env = apiEnv();
  const metadata: Record<string, PlanMeta> = {
    [env.STRIPE_PRICE_ID_PRO_MONTHLY]: {
      planName: 'voice gecko pro',
      intervalType: 'monthly',
      minimumQuantity: 1,
    },
    [env.STRIPE_PRICE_ID_PRO_YEARLY]: {
      planName: 'voice gecko pro',
      intervalType: 'yearly',
      minimumQuantity: 1,
    },
  };

  if (env.STRIPE_PRICE_ID_TEAM_MONTHLY) {
    metadata[env.STRIPE_PRICE_ID_TEAM_MONTHLY] = {
      planName: 'voice gecko team',
      intervalType: 'monthly',
      minimumQuantity: 3,
    };
  }
  if (env.STRIPE_PRICE_ID_TEAM_YEARLY) {
    metadata[env.STRIPE_PRICE_ID_TEAM_YEARLY] = {
      planName: 'voice gecko team',
      intervalType: 'yearly',
      minimumQuantity: 3,
    };
  }

  return metadata;
}

export const stripeService = {
  async getPrices(): Promise<Record<PriceId, PriceWithMetadata>> {
    const env = apiEnv();
    const priceIds = [
      env.STRIPE_PRICE_ID_PRO_MONTHLY,
      env.STRIPE_PRICE_ID_PRO_YEARLY,
      env.STRIPE_PRICE_ID_TEAM_MONTHLY,
      env.STRIPE_PRICE_ID_TEAM_YEARLY,
    ].filter((id): id is string => Boolean(id));

    const priceMetadata = buildPriceMetadata();

    const results = await Promise.allSettled(
      priceIds.map((id) =>
        stripeClient.prices.retrieve(id, {
          expand: ['currency_options'],
        })
      )
    );

    const prices: Stripe.Price[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        prices.push(result.value);
        return;
      }

      const reason = result.reason as
        | { message?: string; code?: string }
        | unknown;
      log.warn(
        {
          priceId: priceIds[index],
          error:
            reason && typeof reason === 'object'
              ? {
                  message: (reason as { message?: string }).message,
                  code: (reason as { code?: string }).code,
                }
              : { message: String(reason) },
        },
        'Stripe price retrieval failed; skipping this price'
      );
    });

    log.info('Retrieved Stripe prices', { count: prices.length });

    const priceData = prices.reduce(
      (acc, price) => {
        const metadata = priceMetadata[price.id];

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
