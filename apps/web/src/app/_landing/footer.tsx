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

const productLinks = ['Download', 'About Us', 'Careers'];

export default function Footer() {
  return (
    <SectionWrapper className="">
      <div className="space-y-12">
        {/* Top Benefits Section */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-6 border-gray-200 border-y py-6 md:gap-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          {benefits.map((benefit) => {
            const IconComponent = iconMap[benefit.icon];

            return (
              <div className="flex items-center gap-2" key={benefit.text}>
                <IconComponent className="h-5 w-5 flex-shrink-0 text-gray-700" />
                <span
                  className={cn(
                    'text-sm',
                    benefit.icon === 'logo'
                      ? 'font-semibold text-black'
                      : 'font-normal text-gray-700'
                  )}
                  style={
                    benefit.icon !== 'logo' ? { color: '#292D34' } : undefined
                  }
                >
                  {benefit.text}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* Product Columns */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {Array.from({ length: 5 }, (_, colIndex) => colIndex).map(
            (colIndex) => (
              <div className="space-y-4" key={`column-${colIndex}`}>
                <h3 className="font-semibold text-gray-900 text-sm">Product</h3>
                <ul className="space-y-3">
                  {productLinks.map((link) => (
                    <li key={`${colIndex}-${link}`}>
                      <Link className="text-sm" href={'/'}>
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
          className="flex flex-col items-center justify-between gap-4 border-gray-200 border-t pt-8 md:flex-row"
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

          {/* Center - Copyright */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-center">
              <p className="font-medium text-xs">©2025 VoiceGecko</p>
            </div>

            {/* Right side - Links */}
            <div className="flex items-center gap-6">
              {['Security', 'Privacy', 'Terms', 'Cookie Preferences'].map(
                (link) => (
                  <Link
                    className="font-medium text-xs transition-colors"
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
