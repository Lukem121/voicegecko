import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@acme/ui/components/ui/sonner";
import { ThemeProvider, ThemeToggle } from "@acme/ui/components/ui/theme";
import { cn } from "@acme/ui/lib/utils";

import { TRPCReactProvider } from "~/trpc/react";

import "@acme/ui/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.voicegecko.io"),
  title: "Voice Gecko",
  description: "Voice Gecko is a voice to text platform.",
  openGraph: {
    title: "Voice Gecko",
    description: "Voice Gecko is a voice to text platform.",
    url: "https://www.voicegecko.io",
    siteName: "Voice Gecko",
  },
  twitter: {
    card: "summary_large_image",
    site: "@voicegecko",
    creator: "@voicegecko",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
          plusJakartaSans.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NuqsAdapter>
            <TRPCReactProvider>{props.children}</TRPCReactProvider>
            <Toaster />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
