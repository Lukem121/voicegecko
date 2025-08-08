import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { stripeService } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability';
import { unstable_cache } from 'next/cache';
import { getDownloadsData } from '~/lib/downloads';
import type { DownloadsData } from '~/lib/downloads-utils';
import LandingPageClient from './_components/landing/landing-page-client';

// ISR configuration - revalidate every hour
export const revalidate = 3600; // 1 hour in seconds

// Cache downloads data with ISR tag for on-demand revalidation
const getCachedDownloadsData = unstable_cache(
  async (): Promise<DownloadsData> => {
    return await getDownloadsData();
  },
  ['landing-downloads'],
  {
    revalidate: 3600, // 1 hour
    tags: ['downloads', 'landing-page'],
  }
);

// Cache pricing data with ISR tag for on-demand revalidation
const getCachedPricingData = unstable_cache(
  async (): Promise<Record<string, PriceWithMetadata>> => {
    return await stripeService.getPrices();
  },
  ['landing-pricing'],
  {
    revalidate: 7200, // 2 hours (pricing changes less frequently)
    tags: ['pricing', 'landing-page'],
  }
);

export default async function LandingPage() {
  let downloadsData: DownloadsData | null = null;
  let downloadError: string | undefined;
  let prices: Record<string, PriceWithMetadata> | null = null;
  let pricingError: string | undefined;

  try {
    downloadsData = await getCachedDownloadsData();
  } catch (err) {
    downloadError =
      err instanceof Error ? err.message : 'Unable to load download data';
    log.error('Failed to fetch downloads data:', err);
  }

  try {
    prices = await getCachedPricingData();
  } catch (err) {
    pricingError =
      err instanceof Error ? err.message : 'Unable to load pricing data';
    log.warn(
      'Failed to fetch pricing data (user may not be authenticated):',
      err
    );
  }

  return (
    <LandingPageClient
      downloadError={downloadError}
      downloadsData={downloadsData}
      prices={prices}
      pricingError={pricingError}
    />
  );
}
