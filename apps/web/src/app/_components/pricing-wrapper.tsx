'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { Suspense } from 'react';
import PricingSection from './pricing';

type PricingWrapperProps = {
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
};

function PricingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="flex items-end justify-between gap-4">
        <div className="text-left">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-2 h-8 w-64 rounded bg-muted" />
          <div className="mt-2 h-16 w-96 rounded bg-muted" />
        </div>
        <div className="h-12 w-32 rounded bg-muted" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {['basic', 'pro'].map((plan) => (
          <div className="h-96 rounded-2xl bg-muted" key={plan} />
        ))}
      </div>

      <div className="mt-12 h-24 rounded-lg bg-muted" />
    </div>
  );
}

/**
 * Wrapper component that provides Suspense boundary for PricingSection
 * to handle useQueryState during static generation
 */
export default function PricingWrapper({
  prices,
  pricingError,
}: PricingWrapperProps) {
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <PricingSection prices={prices} pricingError={pricingError} />
    </Suspense>
  );
}
