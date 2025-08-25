import LogoText from '@acme/ui/components/logos/logo-text';
import { useSidebar } from '@acme/ui/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@acme/ui/components/ui/tooltip';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Clock, FileText, Gauge, PanelLeftIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { useUsageStats } from '~/hooks/use-usage-stats';

const appWindow = getCurrentWindow();

// Animation constants
const SKELETON_OPACITY_MIN = 0.6;
const SKELETON_OPACITY_MAX = 1;
const SKELETON_PULSE_DURATION = 1.5;
const LOADING_SCALE_FACTOR = 1.1;
const LOADING_OPACITY = 0.7;
const LOADING_ANIMATION_DURATION = 2;
const STAT_TRANSITION_DURATION = 0.3;
const STAT_ENTRY_DELAY = 0.2;
const STAT_ENTRY_DELAY_LONG = 0.4;
const CUBIC_BEZIER_EASING = [0.4, 0.0, 0.2, 1] as const;

// Skeleton component for loading states
function StatSkeleton() {
  return (
    <motion.div
      animate={{
        opacity: [
          SKELETON_OPACITY_MIN,
          SKELETON_OPACITY_MAX,
          SKELETON_OPACITY_MIN,
        ],
      }}
      className="h-3 w-8 animate-pulse rounded bg-muted"
      initial={{ opacity: SKELETON_OPACITY_MIN }}
      transition={{
        duration: SKELETON_PULSE_DURATION,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
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
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="skeleton"
            transition={{ duration: 0.2 }}
          >
            <StatSkeleton />
          </motion.div>
        ) : (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex items-center font-medium text-foreground text-xs"
            exit={{ opacity: 0, y: -2 }}
            initial={{ opacity: 0, y: 2 }}
            key="value"
            transition={{
              duration: STAT_TRANSITION_DURATION,
              ease: CUBIC_BEZIER_EASING,
            }}
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

    checkMaximized();

    // Listen for resize events to update maximize state
    const unlistenResize = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlistenResize.then((fn) => fn());
    };
  }, []);

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  return (
    <div className="fixed top-0 right-0 left-0 z-[9999] flex h-12 select-none border-border border-b bg-background">
      <div className="h-full flex-1" data-tauri-drag-region />
      <div className="pointer-events-none absolute top-0 right-0 left-2 flex h-full items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoText className="h-7 pt-1.5 pl-1" />
        </div>

        <div className="flex items-center gap-3">
          {/* Usage Stats */}
          <motion.div
            animate={{ opacity: 1 }}
            className="pointer-events-auto flex items-center gap-4"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: usageStats.isLoading
                        ? [1, LOADING_SCALE_FACTOR, 1]
                        : 1,
                      opacity: usageStats.isLoading ? LOADING_OPACITY : 1,
                    }}
                    transition={{
                      duration: usageStats.isLoading
                        ? LOADING_ANIMATION_DURATION
                        : STAT_TRANSITION_DURATION,
                      repeat: usageStats.isLoading
                        ? Number.POSITIVE_INFINITY
                        : 0,
                      ease: 'easeInOut',
                    }}
                  >
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                  <StatValue
                    isLoading={usageStats.isLoading}
                    value={usageStats.wordsProcessed}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="z-[10000]" side="bottom">
                <p>Total words processed across all dictations</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: usageStats.isLoading
                        ? [1, LOADING_SCALE_FACTOR, 1]
                        : 1,
                      opacity: usageStats.isLoading ? LOADING_OPACITY : 1,
                    }}
                    transition={{
                      duration: usageStats.isLoading
                        ? LOADING_ANIMATION_DURATION
                        : STAT_TRANSITION_DURATION,
                      repeat: usageStats.isLoading
                        ? Number.POSITIVE_INFINITY
                        : 0,
                      ease: 'easeInOut',
                      delay: STAT_ENTRY_DELAY,
                    }}
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                  <StatValue
                    isLoading={usageStats.isLoading}
                    value={usageStats.timeSaved}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="z-[10000]" side="bottom">
                <p>Estimated time saved through dictation</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: usageStats.isLoading
                        ? [1, LOADING_SCALE_FACTOR, 1]
                        : 1,
                      opacity: usageStats.isLoading ? LOADING_OPACITY : 1,
                    }}
                    transition={{
                      duration: usageStats.isLoading
                        ? LOADING_ANIMATION_DURATION
                        : STAT_TRANSITION_DURATION,
                      repeat: usageStats.isLoading
                        ? Number.POSITIVE_INFINITY
                        : 0,
                      ease: 'easeInOut',
                      delay: STAT_ENTRY_DELAY_LONG,
                    }}
                  >
                    <Gauge className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                  <StatValue
                    isLoading={usageStats.isLoading}
                    value={usageStats.wordsPerMinute}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="z-[10000]" side="bottom">
                <p>Average words per minute dictation speed</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>

          <div className="h-4 w-px bg-border" />

          <div className="pointer-events-auto flex">
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-foreground transition-colors duration-150 hover:bg-accent active:bg-accent/80"
              onClick={toggleSidebar}
              title="Minimize"
              type="button"
            >
              <PanelLeftIcon className="h-3 w-3" />
            </button>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-foreground transition-colors duration-150 hover:bg-accent active:bg-accent/80"
              onClick={handleMinimize}
              title="Minimize"
              type="button"
            >
              <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
                <title>Minimize</title>
                <path
                  d="M2 6h8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-foreground transition-colors duration-150 hover:bg-accent active:bg-accent/80"
              onClick={handleMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              type="button"
            >
              {isMaximized ? (
                <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
                  <title>Restore</title>
                  <path
                    d="M3 4.5h6v6H3V4.5zM4.5 3V1.5h6v6H9"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              ) : (
                <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
                  <title>Maximize</title>
                  <rect
                    fill="none"
                    height="8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    width="8"
                    x="2"
                    y="2"
                  />
                </svg>
              )}
            </button>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-foreground transition-colors duration-150 hover:bg-red-500 hover:text-white active:bg-red-600 active:text-white"
              onClick={handleClose}
              title="Close"
              type="button"
            >
              <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
                <title>Close</title>
                <path
                  d="M3 3l6 6m0-6l-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
