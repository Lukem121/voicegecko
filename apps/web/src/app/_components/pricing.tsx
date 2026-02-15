'use client';

import type { PriceWithMetadata } from '@acme/api/src/services/stripe/stripe.service';
import { Button } from '@acme/ui/components/ui/button';
import { Card } from '@acme/ui/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import GeckoStudentSitting from 'public/assets/images/geckos/gecko-student-sitting.png';
import { useEffect, useRef, useState } from 'react';
import { HiCheck } from 'react-icons/hi';
import { type FeatureItem, PriceCard } from '~/components/pricing/price-card';
import { StudentDiscountModal } from '~/components/student-discount-modal';
import { useStudentDiscountModal } from '~/hooks/use-student-discount-modal';
import { useSubscriptionUpgrade } from '~/hooks/use-subscription-upgrade';
import { authClient } from '~/lib/auth/client';
import { useCurrency } from '~/providers/currency';
import {
  getPriceDisplayFor,
  getYearlyPriceAsMonthlyFor,
} from '~/utils/pricing';
import Section from './section';

type BillingPeriod = 'monthly' | 'yearly';

type PricingSectionProps = {
  prices: Record<string, PriceWithMetadata> | null;
  pricingError?: string;
  autoCheckoutPlan?: 'voice gecko pro' | 'voice gecko team';
  autoCheckoutBilling?: 'annual' | 'monthly';
  shouldAutoCheckout?: boolean;
};

export default function PricingSection({
  prices,
  pricingError,
  autoCheckoutPlan,
  autoCheckoutBilling,
  shouldAutoCheckout = false,
}: PricingSectionProps) {
  const { data: session } = authClient.useSession();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const { currency } = useCurrency();
  const isYearly = billingPeriod === 'yearly';
  const isLoggedIn = !!session?.user;
  const { upgrade } = useSubscriptionUpgrade();
  const autoCheckoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (autoCheckoutBilling === 'annual') {
      setBillingPeriod('yearly');
      return;
    }

    if (autoCheckoutBilling === 'monthly') {
      setBillingPeriod('monthly');
    }
  }, [autoCheckoutBilling]);

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

    const isAnnual = autoCheckoutBilling !== 'monthly';

    const runCheckout = async () => {
      await upgrade(autoCheckoutPlan, isAnnual);
    };

    runCheckout().catch(() => {
      autoCheckoutTriggeredRef.current = false;
    });
  }, [autoCheckoutPlan, autoCheckoutBilling, shouldAutoCheckout, upgrade]);

  const getPriceDisplay = (
    planId: string,
    interval: 'monthly' | 'yearly',
    fallback: string
  ) =>
    getPriceDisplayFor(prices, {
      currencyCode: currency,
      planId,
      interval,
      fallback,
    });

  const getYearlyPriceAsMonthly = (planId: string, fallback: string) =>
    getYearlyPriceAsMonthlyFor(prices, currency, planId, fallback);

  const {
    isOpen: isStudentModalOpen,
    openModal: openStudentModal,
    closeModal: closeStudentModal,
  } = useStudentDiscountModal();

  return (
    <Section className="relative overflow-hidden md:py-12" id="pricing">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="text-left">
          <p className="font-medium text-primary text-sm">
            Transparent Pricing
          </p>
          <h2 className="mt-2 font-hero font-semibold text-3xl tracking-[-0.05em] sm:text-4xl">
            Simple, fair pricing
          </h2>
          <p className="mt-2 max-w-lg text-pretty text-muted-foreground text-sm">
            Start free with 2,000 words per week. Upgrade for unlimited
            dictation whenever you're ready.
          </p>
        </div>

        <div className="flex lg:justify-end">
          <Toggle selected={billingPeriod} setSelected={setBillingPeriod} />
        </div>
      </div>
      {shouldAutoCheckout && (
        <output className="mt-6 block rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-primary text-sm">
          Redirecting you to secure checkout...
        </output>
      )}
      <div>
        <div className="mt-6 grid gap-6 md:h-[33rem] md:grid-cols-3">
          <PriceCard
            className="order-2 md:order-1"
            cta={isLoggedIn ? 'Download App' : 'Get Started'}
            features={
              [
                {
                  text: '2,000 words per week',
                  included: true,
                  subtext: 'Reset every Monday',
                },
                { text: 'Lightning fast dictation', included: true },
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
            className="order-1 md:order-2"
            cta={isLoggedIn ? 'Upgrade to Pro' : 'Get Started'}
            features={
              [
                {
                  text: 'Unlimited dictations',
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
          <PriceCard
            className="order-3"
            cta={isLoggedIn ? 'Start Team Plan' : 'Get Started'}
            features={
              [
                {
                  text: 'Unlimited dictations (per seat)',
                  included: true,
                },
                { text: 'Invite team members', included: true },
                { text: 'Manage seats in billing portal', included: true },
                { text: 'Priority support', included: true },
              ] as FeatureItem[]
            }
            highlight={false}
            isAnnual={isYearly}
            isLoggedIn={isLoggedIn}
            name="Team"
            originalPrice={
              isYearly
                ? getPriceDisplay('voice gecko team', 'monthly', '$5.99')
                : undefined
            }
            period="month"
            planType="team"
            price={
              isYearly
                ? getYearlyPriceAsMonthly('voice gecko team', '$4.79')
                : getPriceDisplay('voice gecko team', 'monthly', '$5.99')
            }
            subtitle="Per seat pricing (min 3 seats)"
          />
        </div>
        <div className="mt-8 md:mt-12">
          <Card className="relative border-2 border-border/80 border-dashed bg-background p-5 shadow-none">
            <Image
              alt="Student"
              className="-translate-y-1/2 -top-3 absolute left-0 h-10 w-auto"
              src={GeckoStudentSitting}
            />
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-3">
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
      <div className="mt-8 md:mt-10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-sm sm:gap-5">
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
