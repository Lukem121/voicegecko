'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import GeckoInvisibleWall from 'public/assets/images/geckos/gecko-invisible-wall.png';
import React from 'react';
import { FaWindows } from 'react-icons/fa';
import { HiX } from 'react-icons/hi';

export default function StickyCta() {
  const [show, setShow] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const height = document.body.scrollHeight - window.innerHeight;
      setShow(scrolled > height * 0.2);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(95%,56rem)] rounded-2xl border border-border bg-background/90 p-4 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur sm:bottom-6 sm:p-4"
          exit={{ y: 80, opacity: 0 }}
          initial={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-3">
            {/* Dismiss button - positioned absolutely on mobile for better UX */}
            <button
              aria-label="Dismiss download bar"
              className="-top-1 -right-1 absolute rounded-full p-2 text-muted-foreground hover:text-foreground sm:static sm:order-last sm:rounded-md sm:px-2 sm:py-1"
              onClick={() => setDismissed(true)}
              type="button"
            >
              <HiX className="h-4 w-4" />
            </button>

            {/* Content section */}
            <div className="flex items-center gap-3 pr-8 sm:pr-0">
              <Image
                alt="Gecko peeking"
                className="h-8 w-auto sm:h-10"
                src={GeckoInvisibleWall}
              />
              <p className="text-muted-foreground text-sm leading-tight sm:text-base">
                Turn speech into text in seconds, not minutes.
              </p>
            </div>

            {/* CTA button */}
            <div className="ml-auto w-full sm:w-auto">
              <a
                className={cn(
                  buttonVariants({ variant: 'default', size: 'default' }),
                  'w-full gap-2 px-4 py-2.5 text-white sm:w-auto sm:px-6 sm:text-base'
                )}
                href="/download/windows"
              >
                <FaWindows aria-hidden className="h-4 w-4" />
                <span>Download for Windows</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
