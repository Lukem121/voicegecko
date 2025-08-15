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
          className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(96%,56rem)] rounded-2xl border border-border bg-background/90 p-3 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)] backdrop-blur"
          exit={{ y: 80, opacity: 0 }}
          initial={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <Image
                alt="Gecko peeking"
                className="h-10 w-auto"
                src={GeckoInvisibleWall}
              />
              <p className="text-muted-foreground text-sm md:text-base">
                Turn speech into text in seconds, not minutes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                className={cn(
                  buttonVariants({ variant: 'default', size: 'xl' }),
                  'gap-2 px-6 text-white'
                )}
                href="/download/windows"
              >
                <FaWindows aria-hidden className="h-4 w-4" />
                <span>Download for Windows</span>
              </a>
              <button
                aria-label="Dismiss download bar"
                className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(true)}
                type="button"
              >
                <HiX className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
