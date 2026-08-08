import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { stripeService } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability/log';
import { Card } from '@acme/ui/components/ui/card';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PricingSection from '~/app/_components/pricing';
import Section from '~/app/_components/section';
import {
  clearPlanIntentCookie,
  readPlanIntentCookie,
} from '~/lib/pricing/plan-intent.server';
import { caller } from '~/trpc/server';

export const metadata: Metadata = {
  title: 'Pricing — Voice Gecko',
  description:
    'Voice Gecko is free and open source. Optional $5.99/mo Support helps fund development — same product either way.',
  openGraph: {
    title: 'Pricing — Voice Gecko',
    description:
      'Voice Gecko is free and open source. Optional $5.99/mo Support helps fund development — same product either way.',
  },
};

const getCachedPricingData = unstable_cache(
  async (): Promise<Record<string, PriceWithMetadata>> => {
    return await stripeService.getPrices();
  },
  ['marketing-pricing'],
  { revalidate: 7200, tags: ['pricing', 'marketing'] }
);

export default async function PricingPage() {
  const planIntent = await readPlanIntentCookie();
  const validPlanIds = new Set(['voice gecko pro']);

  const session = await caller.auth.getSession();

  let effectiveSubscription: Awaited<
    ReturnType<typeof caller.stripe.getEffectiveSubscription>
  > | null = null;
  let hasActiveSubscription = false;

  if (session?.user) {
    try {
      effectiveSubscription = await caller.stripe.getEffectiveSubscription();
      hasActiveSubscription = Boolean(effectiveSubscription);
    } catch (error) {
      log.warn(error, 'Failed to fetch effective subscription on pricing page');
    }
  }

  let autoCheckoutPlan: 'voice gecko pro' | undefined;
  let autoCheckoutBilling: 'annual' | 'monthly' | undefined;
  let shouldAutoCheckout = false;

  if (planIntent && !validPlanIds.has(planIntent.planId)) {
    clearPlanIntentCookie();
  } else if (planIntent && validPlanIds.has(planIntent.planId)) {
    if (!session?.user) {
      return redirect(`/sign-up?redirect=${encodeURIComponent('/pricing')}`);
    }

    if (!hasActiveSubscription) {
      autoCheckoutPlan = 'voice gecko pro';
      autoCheckoutBilling = planIntent.billing;
      shouldAutoCheckout = true;
    }

    clearPlanIntentCookie();
  }

  let prices: Record<string, PriceWithMetadata> | null = null;
  try {
    prices = await getCachedPricingData();
  } catch (error) {
    log.error(error, 'Error fetching pricing data');
    prices = null;
  }

  return (
    <>
      <PricingSection
        autoCheckoutBilling={autoCheckoutBilling}
        autoCheckoutPlan={autoCheckoutPlan}
        prices={prices}
        shouldAutoCheckout={shouldAutoCheckout}
      />
      <Section className="py-6 md:py-12">
        <section>
          <h2 className="font-semibold text-2xl">Pricing FAQs</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                q: 'Is Voice Gecko really free?',
                a: 'Yes. The full product is free and open source under the MIT license. There are no word limits or locked features.',
              },
              {
                q: 'What do I get if I pay $5.99/mo?',
                a: 'Exactly the same product as Free. Support is an optional way to fund ongoing development — thank you if you do.',
              },
              {
                q: 'Can I cancel Support anytime?',
                a: 'Yes. Cancel anytime from your account billing settings. You keep full access either way.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Support is a voluntary contribution. If something went wrong with billing, contact us and we will make it right.',
              },
            ].map((item) => (
              <Card className="p-5" key={item.q}>
                <p className="font-medium">{item.q}</p>
                <p className="mt-2 text-muted-foreground text-sm">{item.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-xl border bg-muted/40 p-8 text-center">
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            Voice Gecko is built in the open. Use it free, fork it, contribute —
            or chip in $5.99/mo if you want to support the project.
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
              href="/download"
            >
              Download free
            </Link>
          </div>
        </section>
      </Section>
    </>
  );
}
