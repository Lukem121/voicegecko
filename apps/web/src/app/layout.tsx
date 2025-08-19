import { Toaster } from '@acme/ui/components/ui/sonner';
import { ThemeProvider } from '@acme/ui/components/ui/theme';
import { cn } from '@acme/ui/lib/utils';
import { GoogleTagManager, sendGTMEvent } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { TRPCReactProvider } from '~/trpc/react';
import '@acme/ui/globals.css';
import { CurrencyProvider } from '~/providers/currency';
import { plusJakartaSans, roobert } from './fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.voicegecko.io'),
  title: 'VoiceGecko | Fast Voice-to-Text Dictation for Desktop',
  description:
    'VoiceGecko is a lightning-fast voice-to-text dictation app for desktop. Press a shortcut, speak, and instantly get accurate text on your clipboard—perfect for emails, coding, AI prompts, or brain dumps.',
  openGraph: {
    title: 'VoiceGecko | Fast Voice-to-Text Dictation for Desktop',
    description:
      'Turn your voice into text instantly. VoiceGecko makes dictation effortless, accurate, and fast—built for developers, professionals, and anyone who types too much.',
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
    site: '@voicegecko',
    creator: '@voicegecko',
    title: 'VoiceGecko | Fast Voice-to-Text Dictation for Desktop',
    description:
      'Dictate emails, code, or AI prompts at lightning speed. With VoiceGecko, your words become text instantly.',
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
