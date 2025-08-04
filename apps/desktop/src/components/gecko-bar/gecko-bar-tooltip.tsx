import { motion } from 'motion/react';
import { ANIMATIONS } from './gecko-bar-app.constants';
import type { GeckoBarTooltipProps } from './gecko-bar-app.types';

export function GeckoBarTooltip({
  show,
  isRecording,
  message,
}: GeckoBarTooltipProps) {
  if (!show || isRecording) {
    return null;
  }

  const displayMessage = message ?? 'Click to start dictating';

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="-translate-x-1/2 absolute bottom-full left-1/2 z-[100]"
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      style={{
        minHeight: 'fit-content',
        transform: 'translateX(-50%) translateY(0)',
      }}
      transition={{
        type: 'spring',
        stiffness: ANIMATIONS.TOOLTIP.STIFFNESS,
        damping: ANIMATIONS.TOOLTIP.DAMPING,
        duration: ANIMATIONS.TOOLTIP.DURATION,
      }}
    >
      <div className="whitespace-nowrap rounded-full border border-border bg-background px-3 py-1.5 text-foreground text-sm shadow-lg">
        {displayMessage}
      </div>
    </motion.div>
  );
}
