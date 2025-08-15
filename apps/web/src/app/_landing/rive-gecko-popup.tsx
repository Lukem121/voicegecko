'use client';

import { cn } from '@acme/ui/lib/utils';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas-lite';
import Bush1 from './svgs/bush-1';
import Bush2 from './svgs/bush-2';

export default function RiveGeckoPopup({
  className,
  ariaLabel = 'Animated gecko popping up',
}: {
  className?: string;
  ariaLabel?: string;
}) {
  const { RiveComponent } = useRive(
    {
      src: '/assets/images/geckos/rive/geckopopup.riv',
      autoplay: true,
      stateMachines: 'State Machine 1',
      // Anchor the artboard at the bottom of the canvas and scale to width
      layout: new Layout({
        fit: Fit.FitWidth,
        alignment: Alignment.BottomCenter,
      }),
    },
    {
      // Make the canvas height match the artboard height to avoid extra space
      fitCanvasToArtboardHeight: true,
      shouldResizeCanvasToContainer: true,
      useDevicePixelRatio: true,
    }
  );

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        'relative mt-72 w-full cursor-pointer bg-background',
        className
      )}
      role="img"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto w-full">
          {/* Bush 1 - Left side */}
          <Bush1 className="-translate-x-1/2 absolute bottom-0 left-0 z-10 h-auto w-32 sm:w-40 lg:w-[45rem]" />

          {/* Centered Gecko */}
          <RiveComponent className="relative z-20 block h-auto w-full" />

          {/* Bush 2 - Right side */}
          <Bush2 className="absolute right-0 bottom-0 z-10 h-auto w-28 translate-x-1/2 sm:w-32 lg:w-[35rem]" />
        </div>
      </div>
    </section>
  );
}
