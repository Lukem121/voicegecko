'use client';

import { cn } from '@acme/ui/lib/utils';
import Image from 'next/image';
import GeckoInvisibleWall from 'public/assets/images/geckos/gecko-invisible-wall.png';
import GeckoLaptopWithMic from 'public/assets/images/geckos/gecko-laptop-w-mic.png';
import GeckoPointingWithStick from 'public/assets/images/geckos/gecko-pointing-with-stick.png';
import GeckoWelcomeSign from 'public/assets/images/geckos/gecko-welcome-sign.png';
import GeckoWorker from 'public/assets/images/geckos/gecko-worker.png';

export type GeckoPose =
  | 'idle'
  | 'wave'
  | 'point'
  | 'run'
  | 'jump'
  | 'peek'
  | 'float';

export default function RiveGeckoPlaceholder({
  pose = 'idle',
  label,
  className,
}: {
  pose?: GeckoPose;
  label?: string;
  className?: string;
}) {
  if (pose === 'peek') {
    return (
      <Image
        alt="Gecko peeking"
        className={cn('size-auto', className)}
        src={GeckoInvisibleWall}
      />
    );
  }

  if (pose === 'wave') {
    return (
      <Image
        alt="Gecko waving"
        className={cn('size-auto', className)}
        src={GeckoWelcomeSign}
      />
    );
  }

  if (pose === 'point') {
    return (
      <Image
        alt="Gecko pointing"
        className={cn('size-auto', className)}
        src={GeckoPointingWithStick}
      />
    );
  }

  if (pose === 'float') {
    return (
      <Image
        alt="Gecko running"
        className={cn('size-auto', className)}
        src={GeckoWorker}
      />
    );
  }

  if (pose === 'run') {
    return (
      <Image
        alt="Gecko running"
        className={cn('size-auto', className)}
        src={GeckoLaptopWithMic}
      />
    );
  }

  return (
    <div
      aria-label={label ?? `Gecko pose: ${pose}`}
      className={cn(
        'relative grid place-items-center rounded-xl border border-accent/70 border-dashed bg-accent/50 text-accent-foreground',
        className
      )}
      role="img"
    >
      <div className="-z-10 pointer-events-none absolute inset-0 bg-[radial-gradient(400px_120px_at_50%_10%,hsl(var(--accent)),transparent)] opacity-10" />
      <div className="flex flex-col items-center p-3">
        <div className="font-bold text-[10px] uppercase tracking-wider opacity-70">
          Gecko Placeholder
        </div>
        <div className="mt-1 rounded-full bg-background/70 px-2 py-0.5 font-semibold text-[10px]">
          Pose: {pose}
        </div>
        <div className="mt-2 text-[11px] opacity-70">
          Replace with your Rive file
        </div>
      </div>
    </div>
  );
}
