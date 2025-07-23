import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, Loader2, RefreshCw } from "lucide-react";

import LogoFull from "@acme/ui/components/logos/logo-full";
import { Progress } from "@acme/ui/components/ui/progress";

import { useIsAuthenticated } from "~/hooks/auth";
import { initializeApp } from "~/lib/initialize-app";

export function AppLauncher({ onReady }: { onReady: () => void }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [showProgress, setShowProgress] = useState(false);

  // Get authentication state
  const auth = useIsAuthenticated();

  useEffect(() => {
    async function init() {
      try {
        // Initialize the app with progress callbacks
        await initializeApp({
          onUpdateStatus: (status) => {
            setUpdateStatus(status);
            // Show progress bar for download-related statuses
            const shouldShowProgress =
              status.includes("Downloading") ||
              status.includes("Installing") ||
              status.includes("found:");
            setShowProgress(shouldShowProgress);
          },
          onUpdateProgress: (progress) => {
            setUpdateProgress(progress);
          },
        });

        // Show gecko bar if enabled
        const geckoBarConfig = await invoke<{ enabled: boolean }>(
          "get_gecko_bar_config",
        );
        if (geckoBarConfig.enabled) {
          await invoke("show_gecko_bar");
        }

        setIsInitializing(false);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setIsInitializing(false);
      }
    }

    void init();
  }, []);

  // Wait for both app initialization and authentication to be ready
  useEffect(() => {
    if (!isInitializing && !auth.isLoading) {
      console.log("App launcher: Both app and auth are ready", {
        isInitializing,
        authLoading: auth.isLoading,
        authState: auth.getAuthIssueType(),
      });
      onReady();
    }
  }, [isInitializing, auth.isLoading, onReady]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Failed to initialize
          </h2>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Show launcher while initializing OR while auth is loading
  if (isInitializing || auth.isLoading) {
    // Determine the current status message
    let currentStatus = updateStatus;
    if (!isInitializing && auth.isLoading) {
      currentStatus = "Checking authentication...";
    }

    return (
      <div className="bg-background fixed inset-0 z-50 flex items-center justify-center">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 transform-gpu overflow-hidden blur-[120px] sm:-top-80"
            aria-hidden="true"
          >
            <div
              className="to-primary-muted relative left-[calc(50%)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[45deg] bg-gradient-to-tr from-[#6E9C4A] via-[#6E9C4A]/60 via-[#6E9C4A]/80 to-[#6E9C4A]/40 opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}
            />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-8 px-4">
          <div className="flex justify-center">
            <LogoFull className="h-12" aria-label="Voice Gecko" />
          </div>

          {/* Update status and progress */}
          {currentStatus && (
            <div className="space-y-4">
              <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                {currentStatus.includes("Downloading") && (
                  <Download className="h-4 w-4" />
                )}
                {currentStatus.includes("Installing") && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                {!currentStatus.includes("Downloading") &&
                  !currentStatus.includes("Installing") && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                <span>{currentStatus}</span>
              </div>

              {/* Progress bar for downloads */}
              {showProgress && (
                <div className="space-y-2">
                  <Progress value={updateProgress} className="h-2 w-full" />
                  {updateProgress > 0 && (
                    <div className="text-muted-foreground text-center text-xs">
                      {updateProgress}% complete
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
