'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { Button } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import GeckoStudentSitting from 'public/assets/images/geckos/gecko-student-sitting.png';
import { useState } from 'react';
import { HiCheck } from 'react-icons/hi';
import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';
import { useCurrency } from '~/providers/currency';
import { type FeatureItem, PriceCard } from '../components/cards';
import Section from '../components/section';

type SupportedCurrency = 'usd' | 'eur' | 'gbp';

function formatPriceForCurrency(
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

function formatYearlyAsMonthlyForCurrency(
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

function findPriceForPlanIn(
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

function getPriceDisplayFor(
  prices: Record<string, PriceWithMetadata> | null,
  currencyCode: SupportedCurrency,
  planId: string,
  interval: 'monthly' | 'yearly',
  fallback: string
): string {
  const price = findPriceForPlanIn(prices, planId, interval);
  if (price) {
    return formatPriceForCurrency(price, currencyCode);
  }
  return fallback;
}

function getYearlyPriceAsMonthlyFor(
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

type BillingPeriod = 'monthly' | 'yearly';

export default function PricingSection({
  prices,
  pricingError,
}: {
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
}) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const { currency } = useCurrency();
  const isYearly = billingPeriod === 'yearly';
  const getPriceDisplay = (
    planId: string,
    interval: 'monthly' | 'yearly',
    fallback: string
  ) => getPriceDisplayFor(prices, currency, planId, interval, fallback);
  const getYearlyPriceAsMonthly = (planId: string, fallback: string) =>
    getYearlyPriceAsMonthlyFor(prices, currency, planId, fallback);
  const {
    isOpen: isStudentModalOpen,
    openModal: openStudentModal,
    closeModal: closeStudentModal,
  } = useStudentDiscountModal();

  return (
    <Section className="relative overflow-hidden py-24" id="pricing">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-gradient-to-b from-background/70 to-background/40 px-3 py-1.5 font-medium text-muted-foreground text-xs shadow-sm ring-1 ring-border/60 backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Transparent Pricing
        </span>
        <h2 className="mt-4 font-bold text-3xl text-foreground tracking-tight md:text-4xl">
          Simple, fair pricing
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          Start free with 2,000 words per week. Upgrade for unlimited
          transcription whenever you’re ready.
        </p>
      </div>
      <div className="mt-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Toggle selected={billingPeriod} setSelected={setBillingPeriod} />
        </div>
      </div>
      <div className="mx-auto max-w-3xl">
        <div className="mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
          <PriceCard
            cta="Get Started Free"
            ctaLink="/sign-up"
            features={
              [
                {
                  text: '2,000 words per week',
                  included: true,
                  subtext: 'Reset every Monday',
                },
                { text: 'Lightning fast transcription', included: true },
                { text: 'Global shortcut access', included: true },
                { text: 'Add words to dictionary', included: true },
                { text: 'Privacy mode', included: true },
                { text: 'Priority support', included: false },
              ] as FeatureItem[]
            }
            highlight={false}
            name="Basic"
            period="month"
            popular={false}
            price="$0"
            subtitle="Perfect for trying out Voice Gecko"
          />
          <PriceCard
            cta="Upgrade to Pro"
            ctaLink="/sign-up?plan=pro"
            features={
              [
                {
                  text: 'Unlimited transcriptions',
                  included: true,
                  subtext: 'No weekly limits',
                },
                {
                  text: 'Priority processing',
                  included: true,
                  subtext: 'Even faster results',
                },
                { text: 'Early access to new features', included: true },
                {
                  text: 'Priority support',
                  included: true,
                  subtext: 'Get help faster',
                },
                { text: 'Advanced custom dictionary', included: true },
              ] as FeatureItem[]
            }
            highlight
            name="Pro"
            originalPrice={
              isYearly
                ? getPriceDisplay('voice gecko pro', 'monthly', '$29')
                : undefined
            }
            period="month"
            popular
            price={
              isYearly
                ? getYearlyPriceAsMonthly('voice gecko pro', '$24')
                : getPriceDisplay('voice gecko pro', 'monthly', '$29')
            }
            subtitle="For power users and professionals"
          />
        </div>
        <div className="mt-12">
          <Card className="relative border-2 border-border/80 border-dashed bg-background p-5 shadow-none">
            <Image
              alt="Student"
              className="-translate-y-1/2 -top-3 absolute left-0 h-10 w-auto"
              src={GeckoStudentSitting}
            />
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="">
                <p className="font-medium">Student Discount</p>
                <p className="text-muted-foreground text-sm">
                  Students get 50% off the Pro plan
                </p>
              </div>
              <Button onClick={openStudentModal} variant="outline">
                Get discount
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-center gap-5 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <HiCheck className="h-4 w-4 text-primary" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <HiCheck className="h-4 w-4 text-primary" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <HiCheck className="h-4 w-4 text-primary" />
            <span>30-day money back guarantee</span>
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
      <StudentDiscountModal
        isOpen={isStudentModalOpen}
        onClose={closeStudentModal}
      />
    </Section>
  );
}

function Toggle({
  selected,
  setSelected,
}: {
  selected: BillingPeriod;
  setSelected: React.Dispatch<React.SetStateAction<BillingPeriod>>;
}) {
  const isYearly = selected === 'yearly';
  return (
    <div className="relative flex w-fit items-center rounded-full border p-1.5">
      <button
        className={`relative px-4 py-2 z-${isYearly ? '0' : '1'}`}
        onClick={() => setSelected('yearly')}
        type="button"
      >
        {isYearly && (
          <div className="absolute inset-0 rounded-full border border-border bg-neutral-100 dark:bg-neutral-900" />
        )}
        <span
          className={`relative block font-medium text-sm ${isYearly ? 'text-neutral-800 dark:text-white' : 'text-muted-foreground'} duration-200`}
        >
          Yearly
          <span className="ml-2 font-semibold text-green-500 text-xs">
            Save 20%
          </span>
        </span>
      </button>
      <button
        className={`relative px-4 py-2 z-${isYearly ? '1' : '0'}`}
        onClick={() => setSelected('monthly')}
        type="button"
      >
        {!isYearly && (
          <div className="absolute inset-0 rounded-full border border-border bg-neutral-100 dark:bg-neutral-900" />
        )}
        <span
          className={`relative block font-medium text-sm ${isYearly ? 'text-neutral-800 dark:text-white' : 'text-muted-foreground'} duration-200`}
        >
          Monthly
        </span>
      </button>
    </div>
  );
}
