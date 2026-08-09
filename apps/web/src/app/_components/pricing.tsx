'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { HiCheck } from 'react-icons/hi';
import { type FeatureItem, PriceCard } from '~/components/pricing/price-card';
import { useSubscriptionUpgrade } from '~/hooks/use-subscription-upgrade';
import { authClient } from '~/lib/auth/client';
import { useCurrency } from '~/providers/currency';
import { getPriceDisplayFor } from '~/utils/pricing';
import Section from './section';

type PricingSectionProps = {
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
  autoCheckoutPlan?: 'voice gecko pro';
  autoCheckoutBilling?: 'annual' | 'monthly';
  shouldAutoCheckout?: boolean;
};

const SHARED_FEATURES: FeatureItem[] = [
  {
    text: 'Unlimited dictations',
    included: true,
    subtext: 'No weekly limits',
  },
  { text: 'Lightning fast dictation', included: true },
  { text: 'Global shortcut access', included: true },
  { text: 'Custom dictionary', included: true },
  { text: 'Privacy mode', included: true },
  { text: 'Open source', included: true },
];

export default function PricingSection({
  prices,
  pricingError,
  autoCheckoutPlan,
  autoCheckoutBilling,
  shouldAutoCheckout = false,
}: PricingSectionProps) {
  const { data: session } = authClient.useSession();
  const { currency } = useCurrency();
  const isLoggedIn = !!session?.user;
  const { upgrade } = useSubscriptionUpgrade();
  const autoCheckoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (!shouldAutoCheckout) {
      return;
    }

    if (!autoCheckoutPlan) {
      return;
    }

    if (autoCheckoutTriggeredRef.current) {
      return;
    }

    autoCheckoutTriggeredRef.current = true;

    const isAnnual = autoCheckoutBilling === 'annual';

    const runCheckout = async () => {
      await upgrade(autoCheckoutPlan, isAnnual);
    };

    runCheckout().catch(() => {
      autoCheckoutTriggeredRef.current = false;
    });
  }, [autoCheckoutPlan, autoCheckoutBilling, shouldAutoCheckout, upgrade]);

  const supportPrice = getPriceDisplayFor(prices, {
    currencyCode: currency,
    planId: 'voice gecko pro',
    interval: 'monthly',
    fallback: '$5.99',
  });

  return (
    <Section className="relative overflow-hidden md:py-12" id="pricing">
      <div className="text-left">
        <p className="font-medium text-primary text-sm">Free & open source</p>
        <h2 className="mt-2 font-hero font-semibold text-3xl tracking-[-0.05em] sm:text-4xl">
          Free forever. Support if you want.
        </h2>
        <p className="mt-2 max-w-lg text-pretty text-muted-foreground text-sm">
          Voice Gecko is 100% free and open source. Everything is included —
          support the project only if you want to help keep it going.
        </p>
      </div>
      {shouldAutoCheckout && (
        <output className="mt-6 block rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-primary text-sm">
          Redirecting you to secure checkout...
        </output>
      )}
      <div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <PriceCard
            cta={isLoggedIn ? 'Download App' : 'Get Started'}
            features={SHARED_FEATURES}
            highlight={false}
            isAnnual={false}
            isLoggedIn={isLoggedIn}
            name="Free"
            period="month"
            planType="basic"
            popular={false}
            price="$0"
            subtitle="Full product. No limits."
          />
          <PriceCard
            cta={isLoggedIn ? 'Support Voice Gecko' : 'Get Started'}
            features={SHARED_FEATURES}
            highlight
            isAnnual={false}
            isLoggedIn={isLoggedIn}
            name="Support"
            period="month"
            planType="pro"
            popular
            price={supportPrice}
            subtitle="Optional — same product, helps fund development"
          />
        </div>
      </div>
      <div className="mt-8 md:mt-10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-sm sm:gap-5">
          <div className="flex items-center gap-2">
            <HiCheck className="h-4 w-4 text-primary" />
            <span>No credit card required for Free</span>
          </div>
          <div className="flex items-center gap-2">
            <HiCheck className="h-4 w-4 text-primary" />
            <span>Cancel Support anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <HiCheck className="h-4 w-4 text-primary" />
            <span>MIT licensed</span>
          </div>
        </div>
        {pricingError && (
          <p className="mt-6 text-center text-muted-foreground text-xs">
            Unable to load current pricing. Please visit our{' '}
            <Link className="underline" href="/pricing">
              pricing page
            </Link>{' '}
            for the latest information.
          </p>
        )}
      </div>
    </Section>
  );
}
