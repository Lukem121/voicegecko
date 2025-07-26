import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Clock, FileText, Gauge, PanelLeftIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import GeckoFullBody from "@acme/ui/components/geckos/gecko-full-body";
import LogoText from "@acme/ui/components/logos/logo-text";
import { useSidebar } from "@acme/ui/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@acme/ui/components/ui/tooltip";

import { useUsageStats } from "~/hooks/use-usage-stats";

const appWindow = getCurrentWindow();

// Skeleton component for loading states
function StatSkeleton() {
  return (
    <motion.div
      className="bg-muted h-3 w-8 animate-pulse rounded"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Animated stat value component
function StatValue({
  value,
  isLoading,
}: {
  value: string;
  isLoading: boolean;
}) {
  return (
    <div className="relative h-3 min-w-8">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <StatSkeleton />
          </motion.div>
        ) : (
          <motion.span
            key="value"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1],
            }}
            className="text-foreground absolute inset-0 flex items-center text-xs font-medium"
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TitleBar() {
  const { toggleSidebar } = useSidebar();
  const [isMaximized, setIsMaximized] = useState(false);
  const usageStats = useUsageStats();

  useEffect(() => {
    // Check initial maximize state
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    void checkMaximized();

    // Listen for resize events to update maximize state
    const unlistenResize = appWindow.onResized(() => {
      void checkMaximized();
    });

    return () => {
      void unlistenResize.then((fn) => fn());
    };
  }, []);

  const handleMinimize = () => {
    void appWindow.minimize();
  };

  const handleMaximize = () => {
    void appWindow.toggleMaximize();
  };

  const handleClose = () => {
    void appWindow.close();
  };

  return (
    <div className="bg-background border-border fixed top-0 right-0 left-0 z-[9999] flex h-12 border-b select-none">
      <div data-tauri-drag-region className="h-full flex-1" />
      <div className="pointer-events-none absolute top-0 right-0 left-2 flex h-full items-center justify-between">
        <div className="flex items-center gap-2">
          <GeckoFullBody className="pointer-events-auto -mb-[10px] h-9 origin-bottom cursor-pointer transition-transform duration-150 hover:-rotate-3" />
          <LogoText className="h-7 pt-1.5 pl-1" />
        </div>

        <div className="flex items-center gap-3">
          {/* Usage Stats */}
          <motion.div
            className="pointer-events-auto flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: usageStats.isLoading ? [1, 1.1, 1] : 1,
                      opacity: usageStats.isLoading ? 0.7 : 1,
                    }}
                    transition={{
                      duration: usageStats.isLoading ? 2 : 0.3,
                      repeat: usageStats.isLoading ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                  >
                    <FileText className="text-muted-foreground h-3 w-3" />
                  </motion.div>
                  <StatValue
                    value={usageStats.wordsProcessed}
                    isLoading={usageStats.isLoading}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[10000]">
                <p>Total words processed across all transcriptions</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: usageStats.isLoading ? [1, 1.1, 1] : 1,
                      opacity: usageStats.isLoading ? 0.7 : 1,
                    }}
                    transition={{
                      duration: usageStats.isLoading ? 2 : 0.3,
                      repeat: usageStats.isLoading ? Infinity : 0,
                      ease: "easeInOut",
                      delay: 0.2,
                    }}
                  >
                    <Clock className="text-muted-foreground h-3 w-3" />
                  </motion.div>
                  <StatValue
                    value={usageStats.timeSaved}
                    isLoading={usageStats.isLoading}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[10000]">
                <p>Estimated time saved through transcription</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: usageStats.isLoading ? [1, 1.1, 1] : 1,
                      opacity: usageStats.isLoading ? 0.7 : 1,
                    }}
                    transition={{
                      duration: usageStats.isLoading ? 2 : 0.3,
                      repeat: usageStats.isLoading ? Infinity : 0,
                      ease: "easeInOut",
                      delay: 0.4,
                    }}
                  >
                    <Gauge className="text-muted-foreground h-3 w-3" />
                  </motion.div>
                  <StatValue
                    value={usageStats.wordsPerMinute}
                    isLoading={usageStats.isLoading}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[10000]">
                <p>Average words per minute transcription speed</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>

          <div className="bg-border h-4 w-px" />

          <div className="pointer-events-auto flex">
            <button
              className="text-foreground hover:bg-accent active:bg-accent/80 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150"
              onClick={toggleSidebar}
              title="Minimize"
            >
              <PanelLeftIcon className="h-3 w-3" />
            </button>
            <button
              className="text-foreground hover:bg-accent active:bg-accent/80 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150"
              onClick={handleMinimize}
              title="Minimize"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className="text-foreground hover:bg-accent active:bg-accent/80 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150"
              onClick={handleMaximize}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5h6v6H3V4.5zM4.5 3V1.5h6v6H9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect
                    x="2"
                    y="2"
                    width="8"
                    height="8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              className="text-foreground flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150 hover:bg-red-500 hover:text-white active:bg-red-600 active:text-white"
              onClick={handleClose}
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 3l6 6m0-6l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
