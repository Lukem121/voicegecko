import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { stripeService } from '@acme/api/src/services/stripe/stripe.service';
import { log } from '@acme/observability/log';
import { Card } from '@acme/ui/components/ui/card';
import { Separator } from '@acme/ui/components/ui/separator';
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
    'Start free with 2,000 words per week. Upgrade to Pro or Team for unlimited dictation and advanced features.',
  openGraph: {
    title: 'Pricing — Voice Gecko',
    description:
      'Start free with 2,000 words per week. Upgrade to Pro or Team for unlimited dictation and advanced features.',
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
  const validPlanIds = new Set(['voice gecko pro', 'voice gecko team']);

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

  let autoCheckoutPlan: 'voice gecko pro' | 'voice gecko team' | undefined;
  let autoCheckoutBilling: 'annual' | 'monthly' | undefined;
  let shouldAutoCheckout = false;

  if (planIntent && !validPlanIds.has(planIntent.planId)) {
    clearPlanIntentCookie();
  } else if (planIntent && validPlanIds.has(planIntent.planId)) {
    if (!session?.user) {
      return redirect(`/sign-up?redirect=${encodeURIComponent('/pricing')}`);
    }

    if (!hasActiveSubscription) {
      autoCheckoutPlan = planIntent.planId as
        | 'voice gecko pro'
        | 'voice gecko team';
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
      {/* Primary pricing cards reused from landing, with live prices when available */}
      <PricingSection
        autoCheckoutBilling={autoCheckoutBilling}
        autoCheckoutPlan={autoCheckoutPlan}
        prices={prices}
        shouldAutoCheckout={shouldAutoCheckout}
      />
      <Section className="py-6 md:py-12">
        {/* Plan comparison */}
        <section className="">
          <h2 className="font-semibold text-2xl">Compare plans</h2>
          <p className="mt-2 text-muted-foreground">
            Everything you need to move from voice to results.
          </p>
          <div className="mt-6 overflow-hidden rounded-lg border">
            <div className="grid grid-cols-3 bg-muted/40 p-4 font-medium text-sm">
              <div>Feature</div>
              <div>Pro</div>
              <div>Team</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Dictation limit</div>
              <div>Unlimited</div>
              <div>Unlimited (per seat)</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Priority processing</div>
              <div>Included</div>
              <div>Included</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Advanced dictionary</div>
              <div>Included</div>
              <div>Included</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Team management</div>
              <div>Single user</div>
              <div>Invite teammates, manage seats</div>
            </div>
          </div>
        </section>

        {/* FAQs specific to pricing */}
        <section className="mt-20">
          <h2 className="font-semibold text-2xl">Pricing FAQs</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                q: 'Which plan gives me unlimited dictation?',
                a: 'Both Pro and Team unlock unlimited dictations immediately. Pick Pro if you are a solo user or Team if you collaborate with others.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'We have a 30-day money back guarantee on Pro. Cancel anytime from your account settings.',
              },
              {
                q: 'Do you have student pricing?',
                a: 'Yes, students get 50% off Pro. Verify your student email during checkout to apply the discount.',
              },
              {
                q: 'Can I switch between monthly and yearly?',
                a: 'Absolutely. You can switch at any time. Yearly plans come with a discount equivalent to two free months.',
              },
            ].map((item) => (
              <Card className="p-5" key={item.q}>
                <p className="font-medium">{item.q}</p>
                <p className="mt-2 text-muted-foreground text-sm">{item.a}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Social proof / CTA */}
        <section className="mt-20 rounded-xl border bg-muted/40 p-8 text-center">
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            “With Voice Gecko, our status updates and meeting recaps take
            minutes instead of hours. It’s the fastest way to move from ideas to
            action.”
          </p>
          <div className="mt-4">
            <Link
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
              href="/pricing#pricing"
            >
              View plans
            </Link>
          </div>
        </section>
      </Section>
    </>
  );
}
