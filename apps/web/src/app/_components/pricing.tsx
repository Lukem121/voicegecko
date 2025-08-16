'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { Button } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import GeckoStudentSitting from 'public/assets/images/geckos/gecko-student-sitting.png';
import { useState } from 'react';
import { HiCheck } from 'react-icons/hi';
import { type FeatureItem, PriceCard } from '~/components/pricing/price-card';
import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';
import { authClient } from '~/lib/auth/client';
import { useCurrency } from '~/providers/currency';
import {
  getPriceDisplayFor,
  getYearlyPriceAsMonthlyFor,
} from '~/utils/pricing';
import Section from './section';

type BillingPeriod = 'monthly' | 'yearly';

export default function PricingSection({
  prices,
  pricingError,
}: {
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
}) {
  const { data: session } = authClient.useSession();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const { currency } = useCurrency();
  const isYearly = billingPeriod === 'yearly';
  const isLoggedIn = !!session?.user;

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
    <Section className="relative overflow-hidden md:py-12" id="pricing">
      <div className="flex items-end justify-between gap-4">
        <div className="text-left">
          <p className="font-medium text-primary text-sm">
            Transparent Pricing
          </p>
          <h2 className="mt-2 font-hero font-semibold text-4xl tracking-[-0.05em]">
            Simple, fair pricing
          </h2>
          <p className="mt-2 max-w-lg text-pretty text-muted-foreground text-sm">
            Start free with 2,000 words per week. Upgrade for unlimited
            transcription whenever you’re ready.
          </p>
        </div>

        <div className="mt-4">
          <Toggle selected={billingPeriod} setSelected={setBillingPeriod} />
        </div>
      </div>
      <div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <PriceCard
            cta={isLoggedIn ? 'Download App' : 'Get Started'}
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
            isAnnual={isYearly}
            isLoggedIn={isLoggedIn}
            name="Basic"
            period="month"
            planType="basic"
            popular={false}
            price="$0"
            subtitle="Perfect for trying out Voice Gecko"
          />
          <PriceCard
            cta={isLoggedIn ? 'Upgrade to Pro' : 'Get Started'}
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
            isAnnual={isYearly}
            isLoggedIn={isLoggedIn}
            name="Pro"
            originalPrice={
              isYearly
                ? getPriceDisplay('voice gecko pro', 'monthly', '$29')
                : undefined
            }
            period="month"
            planType="pro"
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
