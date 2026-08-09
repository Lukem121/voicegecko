'use client';

import { ThemeToggle } from '@acme/ui/components/ui/theme';
import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import { SiDiscord, SiX } from 'react-icons/si';
import { TbBolt, TbCalendarTime, TbGauge, TbLock } from 'react-icons/tb';
import { CurrencySelector } from '~/providers/currency';
import { APP_ROUTES } from '~/utils/app-routes';
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
  { text: 'Free & open source', icon: 'calendar' as const },
  { text: 'Fast updates', icon: 'bolt' as const },
  { text: 'Secure by design', icon: 'lock' as const },
  { text: 'Optional support', icon: 'speedometer' as const },
];

const mobileBenefits = [
  { text: 'Type less, say more.', icon: 'logo' as const },
];

// Footer sections with actual pages that exist
type FooterLink = {
  name: string;
  href: string;
  icon?: IconType;
  openInNewTab?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { name: 'Download', href: APP_ROUTES.MARKETING.DOWNLOAD },
      { name: 'Pricing', href: APP_ROUTES.MARKETING.PRICING },
      { name: 'Blog', href: APP_ROUTES.MARKETING.BLOG },
    ],
  },
  {
    title: 'Support',
    links: [
      { name: 'Contact', href: APP_ROUTES.MARKETING.CONTACT },
      { name: 'Sales', href: 'mailto:support@voicegecko.dev' },
      { name: 'Careers', href: 'mailto:support@voicegecko.dev' },

    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms', href: APP_ROUTES.LEGAL.TERMS },
      { name: 'Privacy', href: APP_ROUTES.LEGAL.PRIVACY },
    ],
  },
  {
    title: 'Socials',
    links: [
      {
        name: 'Discord',
        href: APP_ROUTES.SOCIALS.DISCORD,
        icon: SiDiscord,
        openInNewTab: true,
      },
      {
        name: 'Twitter',
        href: APP_ROUTES.SOCIALS.TWITTER,
        icon: SiX,
        openInNewTab: true,
      },
    ],
  },
];

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

        {/* Footer Sections */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-6 lg:px-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {footerSections.map((section) => (
            <div className="space-y-4" key={section.title}>
              <h3 className="font-semibold text-gray-900 text-sm dark:text-white">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      className="flex items-center gap-2 text-gray-600 text-sm transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      href={link.href}
                      {...(link.openInNewTab && {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      })}
                    >
                      {link.icon && (
                        <link.icon className="h-4 w-4 flex-shrink-0" />
                      )}
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
              {[
                { name: 'Security', href: APP_ROUTES.LEGAL.SECURITY_POLICY },
              ].map((link) => (
                <Link
                  className="font-medium text-gray-600 text-xs transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  href={link.href}
                  key={link.name}
                >
                  {link.name}
                </Link>
              ))}
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
              {[
                { name: 'Security', href: APP_ROUTES.LEGAL.SECURITY_POLICY },
              ].map((link) => (
                <Link
                  className="font-medium text-gray-600 text-xs transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  href={link.href}
                  key={link.name}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
