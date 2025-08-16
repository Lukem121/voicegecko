'use client';

import { ThemeToggle } from '@acme/ui/components/ui/theme';
import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';
import { TbBolt, TbCalendarTime, TbGauge, TbLock } from 'react-icons/tb';
import { CurrencySelector } from '~/providers/currency';
import SectionWrapper from './section-wrapper';
import LogoOnlyHead from './svgs/logo-only-head';

const iconMap = {
  logo: LogoOnlyHead,
  calendar: TbCalendarTime,
  bolt: TbBolt,
  lock: TbLock,
  speedometer: TbGauge,
} as const;

const benefits = [
  { text: 'Type less, say more.', icon: 'logo' as const },
  { text: '24/7 support', icon: 'calendar' as const },
  { text: 'Fast updates', icon: 'bolt' as const },
  { text: 'Secure and compliant', icon: 'lock' as const },
  { text: '99.9% uptime', icon: 'speedometer' as const },
];

const mobileBenefits = [
  { text: 'Type less, say more.', icon: 'logo' as const },
];

const productLinks = ['Download', 'About Us', 'Careers'];

export default function Footer() {
  return (
    <SectionWrapper className="px-0 md:px-0 lg:px-0">
      <div className="space-y-12">
        {/* Top Benefits Section */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-6 border-gray-200 border-y py-4 md:gap-8 md:py-6"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          {/* Mobile: Only logo benefit */}
          <div className="flex w-full justify-start px-4 md:hidden md:px-6 lg:px-12">
            {mobileBenefits.map((benefit) => {
              const IconComponent = iconMap[benefit.icon];
              return (
                <div className="flex items-center gap-2" key={benefit.text}>
                  <IconComponent className="h-5 w-5 flex-shrink-0 text-gray-700 dark:text-gray-300" />
                  <span className="font-semibold text-black text-sm dark:text-white">
                    {benefit.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Desktop: All benefits */}
          <div className="hidden w-full justify-between px-4 md:flex md:flex-wrap md:items-center md:gap-6 md:px-6 lg:gap-8 lg:px-12">
            {benefits.map((benefit) => {
              const IconComponent = iconMap[benefit.icon];
              return (
                <div className="flex items-center gap-2" key={benefit.text}>
                  <IconComponent className="h-5 w-5 flex-shrink-0 text-gray-700 dark:text-gray-300" />
                  <span
                    className={cn(
                      'text-sm',
                      benefit.icon === 'logo'
                        ? 'font-semibold text-black dark:text-white'
                        : 'font-normal text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {benefit.text}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Product Columns */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-8 px-4 md:grid-cols-3 md:px-6 lg:grid-cols-5 lg:px-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {Array.from({ length: 5 }, (_, colIndex) => colIndex).map(
            (colIndex) => (
              <div className="space-y-4" key={`column-${colIndex}`}>
                <h3 className="font-semibold text-gray-900 text-sm dark:text-white">
                  Product
                </h3>
                <ul className="space-y-3">
                  {productLinks.map((link) => (
                    <li key={`${colIndex}-${link}`}>
                      <Link
                        className="text-gray-600 text-sm transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        href={'/'}
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-between gap-4 border-gray-200 border-t px-4 pt-8 md:flex-row md:px-6 lg:px-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {/* Left side - Currency and Theme */}
          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="flex w-full items-center gap-4 md:w-56">
              <CurrencySelector />
            </div>
            <ThemeToggle />
          </div>

          {/* Mobile: Links on top, Copyright below */}
          <div className="flex flex-col gap-4 md:hidden">
            {/* Links row */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {['Security', 'Privacy', 'Terms', 'Cookie Preferences'].map(
                (link) => (
                  <Link
                    className="font-medium text-gray-600 text-xs transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    href={'/'}
                    key={link}
                  >
                    {link}
                  </Link>
                )
              )}
            </div>

            {/* Copyright row */}
            <div className="text-center">
              <p className="font-medium text-gray-600 text-xs dark:text-gray-400">
                ©2025 VoiceGecko
              </p>
            </div>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden items-center justify-between gap-4 md:flex">
            <div className="text-center">
              <p className="font-medium text-gray-600 text-xs dark:text-gray-400">
                ©2025 VoiceGecko
              </p>
            </div>

            {/* Right side - Links */}
            <div className="flex items-center gap-6">
              {['Security', 'Privacy', 'Terms', 'Cookie Preferences'].map(
                (link) => (
                  <Link
                    className="font-medium text-gray-600 text-xs transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    href={'/'}
                    key={link}
                  >
                    {link}
                  </Link>
                )
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
