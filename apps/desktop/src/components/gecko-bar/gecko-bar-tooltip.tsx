import { motion } from "motion/react";

import type { GeckoBarTooltipProps } from "./gecko-bar-app.types";
import { ANIMATIONS } from "./gecko-bar-app.constants";

export function GeckoBarTooltip({
  show,
  isRecording,
  message,
}: GeckoBarTooltipProps) {
  if (!show || isRecording) {
    return null;
  }

  const displayMessage = message ?? "Click to start dictating";

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
      className="absolute bottom-full left-1/2 z-[100] -translate-x-1/2"
      style={{
        minHeight: "fit-content",
        transform: "translateX(-50%) translateY(0)",
      }}
    >
      <div className="bg-background text-foreground border-border rounded-full border px-3 py-1.5 text-sm whitespace-nowrap shadow-lg">
        {displayMessage}
      </div>
    </motion.div>
  );
}
