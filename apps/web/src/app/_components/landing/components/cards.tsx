'use client';

import { cn } from '@acme/ui/lib/utils';
import { motion } from 'framer-motion';
import type React from 'react';
import { HiCheck, HiX } from 'react-icons/hi';
import RiveGeckoPlaceholder, {
  type GeckoPose,
} from '../components/rive-gecko-placeholder';

export const WhyCard = ({
  title,
  body,
  tag,
}: {
  title: string;
  body: string;
  tag: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-2.5 py-0.5 font-semibold text-[10px] text-accent-foreground">
      {tag}
    </div>
    <h3 className="mt-3 font-semibold text-base text-card-foreground tracking-tight">
      {title}
    </h3>
    <p className="mt-1 text-muted-foreground text-sm">{body}</p>
  </div>
);

export const OutcomeCard = ({
  title,
  bullets,
  pose,
}: {
  title: string;
  bullets: string[];
  pose: Extract<GeckoPose, 'point' | 'peek' | 'float' | 'run'>;
}) => (
  <div className="group hover:-translate-y-0.5 rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-card-foreground tracking-tight">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10 w-auto" pose={pose} />
    </div>
    <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground text-sm">
      {bullets.map((b, i) => (
        <li key={`${b.slice(0, 20)}-${i}`}>{b}</li>
      ))}
    </ul>
  </div>
);

export const HowItWorksItem = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-muted text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-base text-card-foreground tracking-tight">
        {title}
      </h3>
    </div>
    <p className="mt-3 text-muted-foreground text-sm">{body}</p>
  </div>
);

export const UiTile = ({
  title,
  body,
  pose,
}: {
  title: string;
  body: string;
  pose: Extract<GeckoPose, 'peek' | 'run' | 'float'>;
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-base text-card-foreground tracking-tight">
        {title}
      </h3>
      <RiveGeckoPlaceholder className="h-10" pose={pose} />
    </div>
    <p className="mt-2 text-muted-foreground text-sm">{body}</p>
    <div className="mt-4 h-24 rounded-lg border border-border bg-muted text-center text-muted-foreground text-xs">
      <div className="grid h-full place-items-center">Minimal desktop UI</div>
    </div>
  </div>
);

export const StatBlock = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => (
  <div className="rounded-lg border border-border bg-muted p-4 text-center">
    <div className="font-black text-primary text-xl">{value}</div>
    <div className="mt-1 text-muted-foreground text-xs">{label}</div>
  </div>
);

export const Avatar = ({ initial }: { initial: string }) => (
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-bold text-[11px] text-accent-foreground">
    {initial}
  </div>
);

export interface FeatureItem {
  text: string;
  subtext?: string;
  included: boolean;
  isHighlight?: boolean;
}

export function PriceCard({
  name,
  price,
  originalPrice,
  features,
  cta,
  ctaLink = '/pricing',
  highlight,
  subtitle,
  popular,
  period = 'month',
}: {
  name: string;
  price: string;
  originalPrice?: string;
  features: FeatureItem[];
  cta: string;
  ctaLink?: string;
  highlight?: boolean;
  subtitle?: string;
  popular?: boolean;
  period?: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative grid h-full w-full grid-rows-[170px_1fr_auto] overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0px_12px_40px_rgba(0,0,0,0.12)] transition-all',
        highlight
          ? 'ring-1 ring-primary/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0px_18px_50px_rgba(0,0,0,0.16)] hover:ring-primary/40'
          : 'ring-1 ring-border/70 hover:shadow-[0px_10px_30px_rgba(0,0,0,0.10)]',
        highlight && 'border-2 border-primary'
      )}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: highlight ? 0.08 : 0 }}
    >
      <div
        className={cn(
          'flex h-full flex-col space-y-1.5 border-b p-5',
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
        <div
          className={cn('flex items-baseline pt-1', originalPrice && 'pt-0')}
        >
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
      <div className="flex h-full flex-col justify-start p-5">
        <ul className="space-y-3.5">
          {features.map((feature, index) => (
            <FeatureListItem key={`${feature.text}-${index}`} {...feature} />
          ))}
        </ul>
      </div>
      <div className="p-5 pt-0">
        <a
          className={cn(
            'inline-flex h-11 w-full items-center justify-center rounded-lg px-8 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
            highlight
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-muted text-foreground hover:bg-muted/80'
          )}
          href={ctaLink}
        >
          {cta}
        </a>
      </div>
      {highlight && (
        <div className="-z-10 pointer-events-none absolute inset-0 blur-2xl">
          <div className="absolute inset-0 rounded-2xl bg-primary/10" />
        </div>
      )}
    </motion.div>
  );
}

export function FeatureListItem({
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

export function TestimonialCard({
  quote,
  author,
  jobRole,
  company,
  avatar,
}: {
  quote: string;
  author: string;
  jobRole: string;
  company: string;
  avatar: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <blockquote className="text-muted-foreground text-sm">
        "{quote}"
      </blockquote>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground text-sm">
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-card-foreground text-sm">{author}</p>
          <p className="text-muted-foreground text-xs">
            {jobRole} at {company}
          </p>
        </div>
      </div>
    </div>
  );
}
