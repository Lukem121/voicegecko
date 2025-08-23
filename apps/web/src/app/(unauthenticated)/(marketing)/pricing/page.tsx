import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { stripeService } from '@acme/api/src/services/stripe/stripe.service';
import { Card } from '@acme/ui/components/ui/card';
import { Separator } from '@acme/ui/components/ui/separator';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import PricingSection from '~/app/_components/pricing';
import Section from '~/app/_components/section';

export const metadata: Metadata = {
  title: 'Pricing — Voice Gecko',
  description:
    'Simple, transparent pricing. Start free, upgrade when you need unlimited transcription and advanced features.',
  openGraph: {
    title: 'Pricing — Voice Gecko',
    description:
      'Simple, transparent pricing. Start free, upgrade when you need unlimited transcription and advanced features.',
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
  let prices: Record<string, PriceWithMetadata> | null = null;
  try {
    prices = await getCachedPricingData();
  } catch {
    prices = null;
  }

  return (
    <>
      {/* Primary pricing cards reused from landing, with live prices when available */}
      <PricingSection prices={prices} />
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
              <div>Basic</div>
              <div>Pro</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Weekly word allowance</div>
              <div>2,000</div>
              <div>Unlimited</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Processing speed</div>
              <div>Standard</div>
              <div>Priority</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Custom dictionary</div>
              <div>Basic</div>
              <div>Advanced</div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 p-4 text-sm">
              <div className="font-medium">Support</div>
              <div>Email</div>
              <div>Priority</div>
            </div>
          </div>
        </section>

        {/* FAQs specific to pricing */}
        <section className="mt-20">
          <h2 className="font-semibold text-2xl">Pricing FAQs</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                q: 'Can I use Voice Gecko for free?',
                a: 'Yes. The Basic plan gives you 2,000 words per week, reset every Monday. Upgrade to Pro for unlimited usage.',
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
              href="/sign-up"
            >
              Get started free
            </Link>
          </div>
        </section>

        <section className="mt-20">
          <pre>{JSON.stringify(prices, null, 2)}</pre>
        </section>
      </Section>
    </>
  );
}
