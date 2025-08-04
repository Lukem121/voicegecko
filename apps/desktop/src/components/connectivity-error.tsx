import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { cn } from '@acme/ui/lib/utils';
import {
  AlertCircle,
  Globe,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ConnectivityErrorProps {
  isOnline: boolean;
  isApiReachable: boolean;
  isChecking: boolean;
  diagnosis: 'healthy' | 'no_internet' | 'api_down' | 'unknown';
  lastSuccessfulCheck?: Date | null;
  onRetry: () => void;
  className?: string;
}

// Helper function to get server status display text and styling
const getServerStatusDisplay = (isApiReachable: boolean, isOnline: boolean) => {
  if (isApiReachable) {
    return { text: 'Reachable', className: 'text-green-600' };
  }
  if (isOnline) {
    return { text: 'Unreachable', className: 'text-red-600' };
  }
  return { text: 'Not checked', className: 'text-gray-500' };
};

// Helper function to get troubleshooting content based on diagnosis
const getTroubleshootingContent = (
  diagnosis: string,
  isUserIssue: boolean | null
) => {
  let title: string;
  if (isUserIssue === true) {
    title = 'How to fix this:';
  } else if (isUserIssue === false) {
    title = "What we're doing:";
  } else {
    title = 'Troubleshooting:';
  }

  let content: JSX.Element;
  if (diagnosis === 'no_internet') {
    content = (
      <>
        <li>• Check your WiFi or ethernet connection</li>
        <li>• Try opening a website in your browser</li>
        <li>• Restart your router if needed</li>
        <li>• Contact your internet provider if the issue persists</li>
      </>
    );
  } else if (diagnosis === 'api_down') {
    content = (
      <>
        <li>• Our team has been automatically notified</li>
        <li>• We're working to restore service as quickly as possible</li>
        <li>• Check our status page for updates</li>
        <li>• Try again in a few minutes</li>
      </>
    );
  } else {
    content = (
      <>
        <li>• Check your internet connection first</li>
        <li>• Voice Gecko servers may be experiencing issues</li>
        <li>• Check if your firewall is blocking the app</li>
        <li>• Try again in a few minutes</li>
      </>
    );
  }

  return { title, content };
};

export function ConnectivityError({
  isOnline,
  isApiReachable,
  isChecking,
  diagnosis,
  lastSuccessfulCheck,
  onRetry,
  className,
}: ConnectivityErrorProps) {
  const [manualRetryDisabledUntil, setManualRetryDisabledUntil] =
    useState<Date | null>(null);
  const [nextAutoRetryIn, setNextAutoRetryIn] = useState<number>(30);

  // Auto-retry every 30 seconds continuously, but not if user recently clicked manual retry
  useEffect(() => {
    if (diagnosis !== 'healthy') {
      // Reset countdown when starting a new cycle
      setNextAutoRetryIn(30);

      const timer = setTimeout(() => {
        // Don't auto-retry if user recently clicked manual retry
        if (manualRetryDisabledUntil && new Date() < manualRetryDisabledUntil) {
          return;
        }

        onRetry();
      }, 30_000);

      return () => clearTimeout(timer);
    }
    setNextAutoRetryIn(30);
  }, [diagnosis, onRetry, manualRetryDisabledUntil]);

  // Countdown timer for next auto-retry
  useEffect(() => {
    if (diagnosis !== 'healthy' && !isChecking) {
      const interval = setInterval(() => {
        setNextAutoRetryIn((prev) => {
          if (prev <= 1) {
            return 30; // Reset for next cycle
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [diagnosis, isChecking]);

  const getStatusInfo = () => {
    switch (diagnosis) {
      case 'no_internet':
        return {
          icon: WifiOff,
          title: 'No Internet Connection',
          description:
            "Your device isn't connected to the internet. Voice Gecko can't reach our servers without an active internet connection.",
          variant: 'destructive' as const,
          isUserIssue: true,
        };

      case 'api_down':
        return {
          icon: Server,
          title: 'Servers Unavailable',
          description:
            "Your internet connection is working, but we can't reach Voice Gecko's servers. This is likely a temporary issue on our end.",
          variant: 'warning' as const,
          isUserIssue: false,
        };

      case 'healthy':
        return {
          icon: Wifi,
          title: 'Connection Restored',
          description: "You're back online and connected to Voice Gecko!",
          variant: 'success' as const,
          isUserIssue: false,
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Connection Issue',
          description:
            "We're having trouble connecting to Voice Gecko. This could be an internet or server issue.",
          variant: 'warning' as const,
          isUserIssue: null, // Could be either
        };
    }
  };

  const status = getStatusInfo();
  const serverStatus = getServerStatusDisplay(isApiReachable, isOnline);
  const troubleshooting = getTroubleshootingContent(
    diagnosis,
    status.isUserIssue
  );

  const formatLastSuccessful = (date: Date | null) => {
    if (!date) {
      return 'Never';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center p-4',
        className
      )}
    >
      <div className="relative w-full max-w-md">
        {/* Main Error Card */}
        <Card className="relative w-full">
          {/* Gecko Mascot - positioned at bottom-left corner of card */}
          <div className="-bottom-2 -left-2 absolute z-10 hidden sm:block">
            {/* biome-ignore lint: desktop app using static assets */}
            <img
              alt="Voice Gecko construction worker"
              className="hover:-rotate-[5deg] h-16 w-16 origin-bottom cursor-pointer object-contain transition-transform duration-300 ease-in-out"
              src="/geckos/worker.png"
            />
          </div>

          <CardHeader className="text-center">
            <CardTitle className="text-xl">{status.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-12 text-center">
            <p className="text-muted-foreground text-sm">
              {status.description}
            </p>

            {/* Status indicators */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Internet Connection</span>
                </div>
                <span
                  className={cn(
                    'font-medium',
                    isOnline ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span>Voice Gecko Servers</span>
                </div>
                <span className={cn('font-medium', serverStatus.className)}>
                  {serverStatus.text}
                </span>
              </div>
            </div>

            {diagnosis !== 'healthy' && (
              <>
                <div className="space-y-2">
                  {lastSuccessfulCheck && (
                    <p className="text-muted-foreground text-xs">
                      Last successful connection:{' '}
                      {formatLastSuccessful(lastSuccessfulCheck)}
                    </p>
                  )}

                  <Button
                    className={cn(
                      'w-full transition-all duration-300',
                      !isChecking && 'border-dashed'
                    )}
                    disabled={isChecking}
                    onClick={() => {
                      setNextAutoRetryIn(30);
                      // Disable auto-retry for 60 seconds after manual retry
                      setManualRetryDisabledUntil(
                        new Date(Date.now() + 60_000)
                      );
                      onRetry();
                    }}
                    variant="outline"
                  >
                    {isChecking ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Checking connection...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        <span>Check Again</span>
                        <span
                          className={cn(
                            'ml-2 rounded bg-muted px-2 py-0.5 font-mono text-xs transition-all duration-200 ease-in-out'
                          )}
                        >
                          {nextAutoRetryIn}s
                        </span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 text-muted-foreground text-xs">
                  <p className="text-left font-medium">
                    {troubleshooting.title}
                  </p>
                  <ul className="space-y-1 text-left">
                    {troubleshooting.content}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mobile gecko - positioned below card on mobile */}
        <div className="mt-4 flex justify-center sm:hidden">
          <div className="relative">
            {/* biome-ignore lint: desktop app using static assets */}
            <img
              alt="Voice Gecko construction worker"
              className="hover:-rotate-[5deg] h-12 w-12 origin-bottom cursor-pointer object-contain opacity-60 transition-transform duration-300 ease-in-out"
              src="/geckos/worker.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal connectivity indicator for showing in corners/headers
 */
interface ConnectivityIndicatorProps {
  isOnline: boolean;
  isApiReachable: boolean;
  isChecking: boolean;
  diagnosis: 'healthy' | 'no_internet' | 'api_down' | 'unknown';
  lastChecked?: Date | null;
  className?: string;
}

export function ConnectivityIndicator({
  // biome-ignore lint: parameter required by interface but not used in this component
  isOnline,
  // biome-ignore lint: parameter required by interface but not used in this component
  isApiReachable,
  isChecking,
  diagnosis,
  lastChecked,
  className,
}: ConnectivityIndicatorProps) {
  if (diagnosis === 'healthy') {
    return null; // Don't show anything when everything is working
  }

  // Don't show indicator for initial "unknown" state before any checks have been performed
  if (diagnosis === 'unknown' && !lastChecked) {
    return null;
  }

  const getIndicator = () => {
    if (isChecking) {
      return {
        icon: RefreshCw,
        className: 'text-yellow-500 animate-spin',
        text: 'Checking connection...',
      };
    }

    switch (diagnosis) {
      case 'no_internet':
        return {
          icon: WifiOff,
          className: 'text-red-500',
          text: 'No internet connection',
        };

      case 'api_down':
        return {
          icon: Server,
          className: 'text-yellow-500',
          text: 'Voice Gecko servers unavailable',
        };

      default:
        return {
          icon: AlertCircle,
          className: 'text-yellow-500',
          text: 'Connection issue',
        };
    }
  };

  const indicator = getIndicator();
  const Icon = indicator.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon className={cn('h-4 w-4', indicator.className)} />
      <span className="text-muted-foreground">{indicator.text}</span>
    </div>
  );
}
