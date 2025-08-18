import { Toaster } from '@acme/ui/components/ui/sonner';
import { ThemeProvider } from '@acme/ui/components/ui/theme';
import { cn } from '@acme/ui/lib/utils';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { TRPCReactProvider } from '~/trpc/react';

import '@acme/ui/globals.css';
import { CurrencyProvider } from '~/providers/currency';
import { plusJakartaSans, roobert } from './fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.voicegecko.io'),
  title: 'Voice Gecko',
  description: 'Voice Gecko is a voice to text platform.',
  openGraph: {
    title: 'Voice Gecko',
    description: 'Voice Gecko is a voice to text platform.',
    url: 'https://www.voicegecko.io',
    siteName: 'Voice Gecko',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@voicegecko',
    creator: '@voicegecko',
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
              <CurrencyProvider>{props.children}</CurrencyProvider>
            </TRPCReactProvider>
            <Toaster />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
