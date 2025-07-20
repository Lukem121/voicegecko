import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { initializeApp } from "~/lib/initialize-app";

export function AppLauncher({ onReady }: { onReady: () => void }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Initialize the app
        await initializeApp();

        // Show gecko bar if enabled
        const geckoBarConfig = await invoke<{ enabled: boolean }>(
          "get_gecko_bar_config",
        );
        if (geckoBarConfig.enabled) {
          await invoke("show_gecko_bar");
        }

        onReady();
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsInitializing(false);
      }
    }

    void init();
  }, [onReady]);

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

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-4 text-gray-600">Initializing app...</p>
        </div>
      </div>
    );
  }

  return null;
}
