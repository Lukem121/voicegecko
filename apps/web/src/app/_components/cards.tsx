'use client';

import type React from 'react';
import RiveGeckoPlaceholder, { type GeckoPose } from './rive-gecko-placeholder';

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
    <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue bg-brand-blue px-2.5 py-0.5 font-semibold text-[10px] text-accent-foreground">
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
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue font-bold text-[11px] text-accent-foreground">
    {initial}
  </div>
);

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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue font-semibold text-accent-foreground text-sm">
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
