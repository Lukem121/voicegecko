'use client';

import VoiceGeckoLogo from '@acme/ui/components/logos/logo-full';
import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
import
{
  log;
}
from;
('@acme/observability');
Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@acme/ui/components/ui/card'

import { CheckCircle2, ExternalLink, Loader2, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const tauriRedirect = searchParams.get('tauriRedirect');
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const attemptRedirect = (decodedUrl: string) => {
    setIsRedirecting(true);
    setRedirectFailed(false);
    setAttemptCount((prev) => prev + 1);

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Auto-retry timeout - assume redirect failed if still on page after delay
    const redirectTimeout = setTimeout(() => {
      setIsRedirecting(false);
      setRedirectFailed(true);
      setTimeoutId(null);
    }, 3000); // 3 seconds to allow redirect to complete

    setTimeoutId(redirectTimeout);

    try {
      // Use window.location.assign for better compatibility with deep links
      window.location.assign(decodedUrl);
    } catch (error) {
      log.error('Direct redirect failed:', error);

      // Fallback: try opening in a new tab/window
      try {
        window.open(decodedUrl, '_self');
      } catch (fallbackError) {
        log.error('Fallback redirect failed:', fallbackError);
        clearTimeout(redirectTimeout);
        setTimeoutId(null);
        setRedirectFailed(true);
        setIsRedirecting(false);
      }
    }

    // Store timeout ID for cleanup
    return redirectTimeout;
  };

  useEffect(() => {
    if (tauriRedirect && !redirectAttempted) {
      setRedirectAttempted(true);
      const decodedUrl = decodeURIComponent(tauriRedirect);
      log.info('Attempting to redirect to Tauri app:', decodedUrl);

      attemptRedirect(decodedUrl);
    }
  }, [tauriRedirect, redirectAttempted]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Safety net: ensure button is never stuck in loading state
  useEffect(() => {
    if (isRedirecting) {
      const safetyTimeout = setTimeout(() => {
        log.warn('Safety timeout triggered - forcing button to re-enable');
        setIsRedirecting(false);
        setRedirectFailed(true);
      }, 5000); // 5 second safety net

      return () => clearTimeout(safetyTimeout);
    }
  }, [isRedirecting]);

  const handleManualRedirect = () => {
    if (!tauriRedirect) return;

    const decodedUrl = decodeURIComponent(tauriRedirect);
    attemptRedirect(decodedUrl);
  };

  const getButtonContent = () => {
    if (isRedirecting) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Opening...
        </>
      );
    }

    if (redirectFailed && attemptCount > 0) {
      return (
        <>
          <RotateCcw className="mr-2 h-4 w-4" />
          Open Again
        </>
      );
    }

    return (
      <>
        <ExternalLink className="mr-2 h-4 w-4" />
        Open Desktop App
      </>
    );
  };

  return (
    <div className="flex h-dvh items-center justify-center">
      <main className="container mx-auto max-w-md px-4 py-8">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="space-y-4">
            <VoiceGeckoLogo
              aria-label="VoiceGecko Logo"
              className="mx-auto h-10"
            />

            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div className="space-y-2 text-center">
                <CardDescription className="font-semibold text-lg">
                  Authentication Successful!
                </CardDescription>
                <Badge className="text-xs" variant="secondary">
                  Welcome to{' '}
                  <span className="font-bold font-mono">VoiceGecko</span>
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {tauriRedirect && (
              <div className="space-y-4">
                <Button
                  className="w-full"
                  disabled={isRedirecting}
                  onClick={handleManualRedirect}
                  size="lg"
                  variant={redirectFailed ? 'outline' : 'default'}
                >
                  {getButtonContent()}
                </Button>

                <div className="space-y-3 text-center">
                  <details className="group">
                    <summary className="cursor-pointer text-muted-foreground text-xs transition-colors hover:text-foreground">
                      Need help?
                    </summary>
                    <div className="mt-3 space-y-2 text-muted-foreground text-xs">
                      <p>If the button doesn't work:</p>
                      <p>• Check that your desktop app is open</p>
                      <p>• Try restarting the desktop app</p>
                      <p>• Make sure deep links are enabled</p>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
