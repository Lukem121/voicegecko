import type { PriceWithMetadata } from '@acme/api/src/router/stripe.route';
import { log } from '@acme/observability';
import { getDownloadsData } from '~/lib/downloads';
import type { DownloadsData } from '~/lib/downloads-utils';
import { caller } from '~/trpc/server';
import LandingPageClient from './_components/landing-page-client';

export default async function LandingPage() {
  let downloadsData: DownloadsData | null = null;
  let downloadError: string | undefined;
  let prices: Record<string, PriceWithMetadata> | null = null;
  let pricingError: string | undefined;

  try {
    downloadsData = await getDownloadsData();
  } catch (err) {
    downloadError =
      err instanceof Error ? err.message : 'Unable to load download data';
    log.error('Failed to fetch downloads data:', err);
  }

  try {
    prices = await caller.stripe.getPrices();
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
