import { Loader2, Square, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@acme/ui/lib/utils";

import type { GeckoBarButtonProps } from "./gecko-bar-app.types";
import { ANIMATIONS, DIMENSIONS, STYLES } from "./gecko-bar-app.constants";

export function GeckoBarButton({
  type,
  state,
  onClick,
  className,
}: GeckoBarButtonProps) {
  const getButtonStyles = () => {
    if (type === "cancel") {
      return state.isEnabled
        ? "bg-gray-500 hover:bg-gray-600"
        : "cursor-not-allowed bg-gray-400/50";
    }

    // Finish button
    return state.isEnabled
      ? "bg-red-400 hover:bg-red-500"
      : state.isLoading
        ? "bg-gray-500"
        : "cursor-not-allowed bg-red-300/50";
  };

  const getIconColor = () => {
    return state.isEnabled ? "text-white" : "text-white/50";
  };

  const renderIcon = () => {
    if (type === "cancel") {
      return (
        <XIcon
          className={cn("h-full w-full", getIconColor())}
          strokeWidth={STYLES.STROKE_WIDTH}
        />
      );
    }

    // Finish button with loading/normal state
    return (
      <div
        className="relative flex items-center justify-center"
        style={{
          width: DIMENSIONS.BUTTON.ICON_SIZE,
          height: DIMENSIONS.BUTTON.ICON_SIZE,
        }}
      >
        <AnimatePresence mode="wait">
          {state.isLoading ? (
            <motion.div
              key="spinner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: ANIMATIONS.BUTTON_TRANSITION.ICON_DURATION,
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Loader2
                className={cn("animate-spin", getIconColor())}
                style={{
                  width: DIMENSIONS.BUTTON.ICON_SIZE,
                  height: DIMENSIONS.BUTTON.ICON_SIZE,
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="square"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: ANIMATIONS.BUTTON_TRANSITION.ICON_DURATION,
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Square
                className={cn(state.isEnabled ? "fill-white" : "fill-white/50")}
                style={{
                  width: DIMENSIONS.BUTTON.FINISH_ICON_SIZE,
                  height: DIMENSIONS.BUTTON.FINISH_ICON_SIZE,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className={cn(
        "absolute",
        type === "cancel" ? "left-1" : "right-1",
        className,
      )}
      animate={{
        opacity: state.isVisible ? 1 : 0,
      }}
      transition={{
        opacity: {
          duration: ANIMATIONS.BUTTON_TRANSITION.OPACITY_DURATION,
          ease: "easeInOut",
        },
      }}
      style={{
        width: DIMENSIONS.BUTTON.SIZE,
        height: DIMENSIONS.BUTTON.SIZE,
        pointerEvents: state.isVisible ? "auto" : "none",
        willChange: "opacity",
        transform: "translateZ(0)", // Force GPU acceleration
      }}
    >
      <motion.button
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full transition-colors",
          getButtonStyles(),
          state.isLoading ? "cursor-wait" : "",
        )}
        style={{ padding: DIMENSIONS.BUTTON.PADDING }}
        whileTap={state.isEnabled ? { scale: 0.95 } : undefined}
        onClick={state.isLoading ? undefined : onClick}
        disabled={!state.isEnabled || state.isLoading}
      >
        {renderIcon()}
      </motion.button>
    </motion.div>
  );
}
