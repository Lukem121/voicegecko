import { Toaster } from '@acme/ui/components/ui/sonner';
import { ThemeProvider } from '@acme/ui/components/ui/theme';
import { cn } from '@acme/ui/lib/utils';
import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { CurrencyProvider } from '~/providers/currency';
import { TRPCReactProvider } from '~/trpc/react';
import { plusJakartaSans, roobert } from './fonts';

import '@acme/ui/globals.css';
import Script from 'next/script';
import { PostHogUserIdentifier } from '~/components/posthog';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.voicegecko.io'),
  title: 'VoiceGecko | Instant Voice-to-Text for Desktop',
  description:
    'Instant dictation for desktop. Press a shortcut, speak, and instantly get accurate text on your clipboard—perfect for emails, coding, AI prompts, or brain dumps.',
  openGraph: {
    title: 'VoiceGecko | Instant Voice-to-Text for Desktop',
    description:
      'Instant voice-to-text dictation for desktop. Press a shortcut, speak, and instantly get accurate text on your clipboard—perfect for emails, coding, AI prompts, or brain dumps.',
    url: 'https://www.voicegecko.io',
    siteName: 'VoiceGecko',
    images: [
      {
        url: 'https://www.voicegecko.io/opengraph-image', // update with your OG image
        width: 1200,
        height: 630,
        alt: 'VoiceGecko App Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@VoiceGeckoAI',
    creator: '@VoiceGeckoAI',
    title: 'VoiceGecko | Instant Voice-to-Text for Desktop',
    description:
      'Instant voice-to-text dictation for desktop. Press a shortcut, speak, and instantly get accurate text on your clipboard—perfect for emails, coding, AI prompts, or brain dumps.',
    images: ['https://www.voicegecko.io/opengraph-image'], // update with your image
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <GoogleTagManager gtmId="GTM-N623RRVD" />
      <Script
        async
        defer
        id="lucky-orange"
        src="https://tools.luckyorange.com/core/lo.js?site-id=b5d9ffe4"
        strategy="afterInteractive"
      />
      <body
        className={cn(
          'min-h-screen bg-background font-sans text-foreground antialiased',
          plusJakartaSans.variable,
          roobert.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NuqsAdapter>
            <TRPCReactProvider>
              <CurrencyProvider>
                <PostHogUserIdentifier />
                {props.children}
              </CurrencyProvider>
            </TRPCReactProvider>
            <Toaster />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
