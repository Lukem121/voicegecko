import { log } from '@acme/observability/log';
import LogoFull from '@acme/ui/components/logos/logo-full';
import { Progress } from '@acme/ui/components/ui/progress';
import { invoke } from '@tauri-apps/api/core';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AuthTitleBar } from '~/components/auth-title-bar';
import { useAuth } from '~/hooks/use-auth';
import { appLifecycle } from '~/lib/app-lifecycle';
import { isGeckoBarWindow } from '~/lib/window-detection';

function useAppInitialization(onReady: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;
    let unsubscribeProgress: (() => void) | undefined;

    async function init() {
      // Skip initialization if this is the gecko bar window
      if (isGeckoBarWindow()) {
        log.info('[AppLauncher] Gecko bar window detected, proceeding to app');
        onReady();
        return;
      }

      try {
        // Subscribe to update progress
        unsubscribeStatus = appLifecycle.onUpdateStatus((status) => {
          setUpdateStatus(status);
          setIsUpdating(appLifecycle.isUpdating());
        });

        unsubscribeProgress = appLifecycle.onUpdateProgress((progress) => {
          setUpdateProgress(progress);
        });

        // Check for updates (with UI feedback this time)
        await appLifecycle.checkForUpdatesOnce();

        // Show gecko bar if enabled
        const geckoBarConfig = await invoke<{ enabled: boolean }>(
          'get_gecko_bar_config'
        );
        if (geckoBarConfig.enabled) {
          await invoke('show_gecko_bar');
        }

        log.info('[AppLauncher] Initialization complete, waiting for auth...');
      } catch (caughtError) {
        log.error('Failed to initialize app:', caughtError);
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unknown error'
        );
      }
    }

    init();

    // Return cleanup function for useEffect
    return () => {
      if (unsubscribeStatus) {
        unsubscribeStatus();
      }
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }
    };
  }, [onReady]);

  return { error, updateStatus, updateProgress, isUpdating };
}

function LoadingScreen({
  updateStatus,
  updateProgress,
  isUpdating,
}: {
  updateStatus: string;
  updateProgress: number;
  isUpdating: boolean;
}) {
  // Determine the current status message
  let currentStatus = updateStatus;
  let showProgress = false;

  if (isUpdating) {
    // Show progress bar for update-related statuses
    showProgress =
      updateStatus.includes('Downloading') ||
      updateStatus.includes('Installing');
  } else {
    currentStatus = 'Preparing application...';
  }

  return (
    <>
      <AuthTitleBar />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background pt-12">
        {/* Background gradient */}
        <div className="-z-10 absolute inset-0 overflow-hidden">
          <div
            aria-hidden="true"
            className="sm:-top-80 pointer-events-none absolute inset-x-0 transform-gpu overflow-hidden blur-[120px]"
          >
            <div
              className="-translate-x-1/2 relative left-[calc(50%)] aspect-[1155/678] w-[36.125rem] rotate-[45deg] bg-gradient-to-tr from-[#6E9C4A] via-[#6E9C4A]/70 to-[#6E9C4A]/40 to-primary-muted opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              }}
            />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-8 px-4">
          <div className="flex justify-center">
            <LogoFull aria-label="Voice Gecko" className="h-12" />
          </div>

          {/* Update/loading status */}
          {currentStatus && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                {currentStatus.includes('Downloading') && (
                  <Download className="h-4 w-4" />
                )}
                {currentStatus.includes('Installing') && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                {!(
                  currentStatus.includes('Downloading') ||
                  currentStatus.includes('Installing')
                ) && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{currentStatus}</span>
              </div>

              {/* Progress bar for downloads */}
              {showProgress && (
                <div className="space-y-2">
                  <Progress className="h-2 w-full" value={updateProgress} />
                  {updateProgress > 0 && (
                    <div className="text-center text-muted-foreground text-xs">
                      {updateProgress}% complete
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function AppLauncher({ onReady }: { onReady: () => void }) {
  // Get authentication state
  const auth = useAuth();

  // Initialize app and get update state
  const { error, updateStatus, updateProgress, isUpdating } =
    useAppInitialization(onReady);

  // Wait for authentication to be ready AND updates to finish
  useEffect(() => {
    const authReady = !auth.isLoading;
    const updatesComplete = !isUpdating;

    if (authReady && updatesComplete) {
      log.info('App launcher: Authentication ready and updates complete', {
        authLoading: auth.isLoading,
        authState: auth.getAuthState(),
        isUpdating,
      });
      onReady();
    }
  }, [auth.isLoading, auth.getAuthState, isUpdating, onReady]);

  if (error) {
    return (
      <>
        <AuthTitleBar />
        <div className="flex h-screen items-center justify-center pt-12">
          <div className="text-center">
            <h2 className="font-semibold text-red-600 text-xl">
              Failed to initialize
            </h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>
        </div>
      </>
    );
  }

  // Show launcher while updates are running OR auth is loading
  if (isUpdating || auth.isLoading) {
    return (
      <LoadingScreen
        isUpdating={isUpdating}
        updateProgress={updateProgress}
        updateStatus={updateStatus}
      />
    );
  }

  return null;
}
