import { motion } from "motion/react";

import type { GeckoBarTooltipProps } from "./gecko-bar-app.types";
import { ANIMATIONS } from "./gecko-bar-app.constants";

export function GeckoBarTooltip({ show, isRecording }: GeckoBarTooltipProps) {
  if (!show || isRecording) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: ANIMATIONS.TOOLTIP.STIFFNESS,
        damping: ANIMATIONS.TOOLTIP.DAMPING,
        duration: ANIMATIONS.TOOLTIP.DURATION,
      }}
      className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 !border-none whitespace-nowrap"
    >
      <div className="bg-background border-border rounded-full border px-2 py-1 text-sm shadow-lg">
        <span className="text-foreground">Click to start dictating</span>
      </div>
    </motion.div>
  );
}
