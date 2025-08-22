'use client';

import { cn } from '@acme/ui/lib/utils';
import { HiCheck, HiX } from 'react-icons/hi';
import { UpgradeButton } from './upgrade-button';

export type FeatureItem = {
  text: string;
  subtext?: string;
  included: boolean;
  isHighlight?: boolean;
};

export type PriceCardProps = {
  name: string;
  price: string;
  originalPrice?: string;
  features: FeatureItem[];
  cta: string;
  planType: 'basic' | 'pro';
  isLoggedIn: boolean;
  isAnnual?: boolean;
  highlight?: boolean;
  subtitle?: string;
  popular?: boolean;
  period?: string;
  className?: string;
};

function PriceCardHeader({
  name,
  popular,
  originalPrice,
  period = 'month',
  price,
  highlight,
  subtitle,
}: {
  name: string;
  popular?: boolean;
  originalPrice?: string;
  period?: string;
  price: string;
  highlight?: boolean;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-full flex-col space-y-1.5 border-b p-4 md:p-5',
        highlight ? 'border-primary/20 bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg tracking-tight">{name}</h3>
        {popular && (
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 font-semibold text-[11px] text-white shadow-sm">
            Most Popular
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 pt-1">
        {originalPrice && (
          <span className="font-medium text-muted-foreground/70 text-sm line-through">
            {originalPrice}/{period}
          </span>
        )}
      </div>
      <div className={cn('flex items-baseline pt-1', originalPrice && 'pt-0')}>
        <span
          className={cn(
            'font-bold text-3xl',
            highlight ? 'text-foreground' : 'text-foreground'
          )}
        >
          {price === '$0' ? 'Free' : price}
        </span>
        {price !== '$0' && (
          <span className="ml-1 font-medium text-muted-foreground text-sm">
            /{period}
          </span>
        )}
        {highlight && originalPrice && (
          <span className="ml-2 inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-[11px] text-emerald-600 ring-1 ring-emerald-500/20">
            Save
          </span>
        )}
      </div>
      <p className="pt-1 pb-1.5 font-medium text-[15px] text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

function FeatureListItem({
  text,
  subtext,
  included,
  isHighlight,
}: FeatureItem) {
  return (
    <li className="flex items-start gap-3">
      {included ? (
        <HiCheck
          className={cn(
            'mt-0.5 h-4 w-4 flex-shrink-0',
            isHighlight ? 'text-primary' : 'text-emerald-500'
          )}
        />
      ) : (
        <HiX className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
      )}
      <div className="flex-1">
        <p
          className={cn(
            'font-medium text-sm',
            included ? 'text-foreground' : 'text-muted-foreground/60'
          )}
        >
          {text}
        </p>
        {subtext && (
          <p
            className={cn(
              'mt-0.5 text-xs',
              included ? 'text-muted-foreground' : 'text-muted-foreground/60'
            )}
          >
            {subtext}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Pure presentation component for pricing cards.
 * All business logic is handled by the UpgradeButton component.
 */
export function PriceCard({
  name,
  price,
  originalPrice,
  features,
  cta,
  planType,
  isLoggedIn,
  isAnnual,
  highlight,
  subtitle,
  popular,
  period = 'month',
  className,
}: PriceCardProps) {
  return (
    <div
      className={cn(
        'relative grid h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl bg-card shadow-sm transition-all md:grid-rows-[170px_1fr_auto]',
        highlight
          ? 'ring-1 ring-primary/30 hover:ring-primary/40'
          : 'ring-1 ring-border/70',
        highlight && 'border-2 border-primary',
        className
      )}
    >
      <PriceCardHeader
        highlight={highlight}
        name={name}
        originalPrice={originalPrice}
        period={period}
        popular={popular}
        price={price}
        subtitle={subtitle}
      />

      <div className="flex h-full flex-col justify-start p-4 md:p-5">
        <ul className="space-y-3.5">
          {features.map((feature, index) => (
            <FeatureListItem key={`${feature.text}-${index}`} {...feature} />
          ))}
        </ul>
      </div>

      <div className="p-4 pt-0 md:p-5 md:pt-0">
        <UpgradeButton
          highlight={highlight}
          isAnnual={isAnnual}
          isLoggedIn={isLoggedIn}
          planType={planType}
        >
          {cta}
        </UpgradeButton>
      </div>

      {highlight && (
        <div className="-z-10 pointer-events-none absolute inset-0 blur-2xl">
          <div className="absolute inset-0 rounded-2xl bg-primary/10" />
        </div>
      )}
    </div>
  );
}
