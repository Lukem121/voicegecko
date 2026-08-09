'use client';

import VoiceGeckoLogo from '@acme/ui/components/logos/logo-full';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@acme/ui/components/ui/card';
import { CheckCircle, ExternalLink, Loader } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type RedirectState = 'loading' | 'success' | 'manual' | 'error';

export default function Page() {
  const searchParams = useSearchParams();
  const [redirectState, setRedirectState] = useState<RedirectState>('loading');
  const [countdown, setCountdown] = useState(3);

  const tauriRedirect = searchParams.get('tauriRedirect');
  const httpURL = searchParams.get('httpURL');

  // Handle automatic redirect (ensure cookies set first if httpURL present)
  useEffect(() => {
    if (!tauriRedirect) {
      setRedirectState('error');
      return;
    }

    const attemptRedirect = async () => {
      try {
        // Small delay to show loading state
        await new Promise((resolve) => setTimeout(resolve, 500));

        // If server passed an httpURL, call it first to ensure browser cookies are set
        if (httpURL) {
          try {
            await fetch(httpURL, {
              credentials: 'include',
              redirect: 'follow',
            });
          } catch {
            // Non-fatal: proceed to deep link regardless
          }
        }

        // Attempt to redirect to desktop app
        window.location.href = tauriRedirect;

        // Show success state briefly
        setRedirectState('success');

        // After 3 seconds, show manual option in case redirect didn't work
        const fallbackTimer = setTimeout(() => {
          setRedirectState('manual');
        }, 3000);

        return () => clearTimeout(fallbackTimer);
      } catch {
        // Redirect failed, will show manual option
        setRedirectState('manual');
      }
    };

    attemptRedirect();
  }, [tauriRedirect, httpURL]);

  // Countdown timer for manual state
  useEffect(() => {
    if (redirectState === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [redirectState]);

  const handleManualRedirect = () => {
    if (tauriRedirect) {
      window.location.href = tauriRedirect;
    }
  };

  const renderContent = () => {
    switch (redirectState) {
      case 'loading':
        return (
          <>
            <div className="flex items-center justify-center p-4">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardDescription className="text-center">
              Preparing to redirect to Voice Gecko Desktop...
            </CardDescription>
          </>
        );

      case 'success':
        return (
          <>
            <div className="flex items-center justify-center p-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardDescription className="text-center">
              Authentication successful! Redirecting to desktop app
              {countdown > 0 && (
                <span className="mt-2 block text-muted-foreground text-sm">
                  Showing manual option in {countdown}s...
                </span>
              )}
            </CardDescription>
          </>
        );

      case 'manual':
        return (
          <>
            <CardDescription className="mb-4 text-center">
              If the desktop app didn't open automatically, click the button
              below to launch Voice Gecko Desktop.
            </CardDescription>
            <Button
              aria-label="Launch Voice Gecko Desktop"
              className="w-full"
              onClick={handleManualRedirect}
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Launch Desktop App
            </Button>
            <p className="mt-4 text-center text-muted-foreground text-xs">
              Make sure Voice Gecko Desktop is installed on your system
            </p>
          </>
        );

      case 'error':
        return (
          <>
            <CardDescription className="mb-4 text-center text-destructive">
              Something went wrong with the redirect. Please try signing in
              again.
            </CardDescription>
            <CardDescription className="text-center text-muted-foreground text-sm">
              You can safely close this tab.
            </CardDescription>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <main className="container mx-auto max-w-md px-4 py-8">
      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3">
            <VoiceGeckoLogo aria-label="Voice Gecko Logo" className="h-10" />
            <CardDescription className="text-center font-medium">
              Redirecting to{' '}
              <span className="font-bold font-mono">voicegecko</span> desktop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{renderContent()}</CardContent>
        </Card>
      </div>
    </main>
  );
}
