'use client';

import { cn } from '@acme/ui/lib/utils';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas-lite';

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
        'relative w-full cursor-pointer overflow-hidden bg-background',
        className
      )}
      role="img"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto w-full">
          <RiveComponent className="block h-auto w-full" />
        </div>
      </div>
    </section>
  );
}
