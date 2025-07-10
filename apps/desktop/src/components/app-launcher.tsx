import { useEffect, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

import VoiceGeckoLogo from "@acme/ui/components/logos/voice-gecko";
import { Progress } from "@acme/ui/components/ui/progress";

import { initializeApp as initApp } from "~/lib/initialize-app";

interface AppLauncherProps {
  onReady: () => void;
}

export function AppLauncher({ onReady }: AppLauncherProps) {
  const [status, setStatus] = useState<string>("Starting Voice Gecko...");
  const [progress, setProgress] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeApp() {
      try {
        // Step 0: Initialize app settings (auto-start, etc.)
        setStatus("Initializing application...");
        setProgress(10);
        await initApp();

        // Step 1: Check for updates
        setStatus("Checking for updates...");
        setProgress(20);

        const update = await check();

        if (update) {
          console.log(
            `Found update ${update.version} from ${update.date} with notes ${update.body}`,
          );

          setIsUpdating(true);
          setStatus(`Updating to ${update.version}...`);
          setProgress(40);

          let downloaded = 0;
          let contentLength = 0;

          // Download and install the update
          await update.downloadAndInstall((event) => {
            if (!isMounted) return;

            switch (event.event) {
              case "Started":
                contentLength = event.data.contentLength ?? 0;
                setStatus("Downloading update...");
                break;
              case "Progress":
                downloaded += event.data.chunkLength;
                if (contentLength > 0) {
                  const downloadProgress = Math.round(
                    (downloaded / contentLength) * 100,
                  );
                  setProgress(40 + downloadProgress * 0.5); // 40-90% for download
                  setStatus(`Downloading update... ${downloadProgress}%`);
                }
                break;
              case "Finished":
                setStatus("Installing update...");
                setProgress(95);
                break;
            }
          });

          // Update installed, relaunch
          console.log("Update installed, restarting...");
          setStatus("Restarting application...");
          setProgress(100);
          await relaunch();
        } else {
          // No update needed, continue with app launch
          if (!isMounted) return;
          setStatus("Loading application...");
          setProgress(100);

          // Small delay to show completion
          setTimeout(() => {
            if (isMounted) {
              onReady();
            }
          }, 500);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        if (!isMounted) return;

        setError(
          error instanceof Error ? error.message : "Failed to initialize app",
        );
        setStatus("Error occurred");

        // Continue with app launch even if update fails
        setTimeout(() => {
          if (isMounted) {
            onReady();
          }
        }, 2000);
      }
    }

    void initializeApp();

    return () => {
      isMounted = false;
    };
  }, [onReady]);

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
        {/* Logo */}
        <div className="flex justify-center">
          <VoiceGeckoLogo className="h-12" aria-label="Voice Gecko" />
        </div>

        {/* Status and Progress */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm font-medium">{status}</p>
            {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-muted-foreground text-center text-xs">
              {isUpdating
                ? "Updating for security and performance improvements"
                : "Preparing your workspace"}
            </p>
          </div>
        </div>

        {/* Loading animation */}
        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:0ms] [animation-duration:1.5s]"></div>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:150ms] [animation-duration:1.5s]"></div>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:300ms] [animation-duration:1.5s]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
