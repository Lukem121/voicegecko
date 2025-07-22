// This function is used to initialize the app

import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

import { storeRegistry } from "~/stores/store-registry";
import { initializeTauriEvents } from "./tauri-events";

interface InitializeOptions {
  onUpdateStatus?: (status: string) => void;
  onUpdateProgress?: (progress: number) => void;
  onUpdateDownloaded?: () => void;
}

/**
 * Check for and install app updates
 */
async function checkAndInstallUpdates(options?: InitializeOptions) {
  console.log("[Updater] Checking for updates...");
  options?.onUpdateStatus?.("Checking for updates...");

  try {
    const update = await check();
    if (!update?.available) {
      console.log("[Updater] No updates available");
      return;
    }

    console.log("[Updater] Update available:", update.version);
    options?.onUpdateStatus?.(`Downloading update ${update.version}...`);

    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.log("[Updater] Download started");
          contentLength = event.data.contentLength || 0;
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          const progress =
            contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0;
          console.log(`[Updater] Download progress: ${progress}%`);
          options?.onUpdateProgress?.(progress);
          options?.onUpdateStatus?.(`Downloading update... ${progress}%`);
          break;
        case "Finished":
          console.log("[Updater] Download finished");
          options?.onUpdateStatus?.("Installing update...");
          options?.onUpdateDownloaded?.();
          break;
      }
    });

    console.log("[Updater] Update installed, relaunching...");
    await relaunch();
  } catch (error) {
    // Don't throw on update errors - the app should still work
    console.error("[Updater] Failed to check/install updates:", error);
  }
}

/**
 * Initialize the application
 * This should be called once when the main window loads
 */
export async function initializeApp(
  options?: InitializeOptions,
): Promise<void> {
  console.log("[App] 🚀 Initializing application...");

  try {
    // Check for updates first during launch
    await checkAndInstallUpdates(options);

    // Synchronize models to detect bundled models
    options?.onUpdateStatus?.("Initializing models...");
    await invoke("synchronize_models"); // Synchronize models first

    // Check and clean up any partial downloads from previous sessions
    try {
      const partialFiles = await invoke<string[]>(
        "check_and_fix_partial_downloads",
      );
      if (partialFiles.length > 0) {
        console.log("[App] Cleaned up partial downloads:", partialFiles);
      }
    } catch (error) {
      console.warn("[App] Failed to check partial downloads:", error);
    }

    options?.onUpdateStatus?.("Initializing application...");
    await storeRegistry.initializeAll();

    // Initialize Tauri event listeners
    await initializeTauriEvents();

    // Trigger automatic download of recommended model (non-blocking)
    // Add a small delay to ensure model synchronization is complete
    setTimeout(() => {
      const downloadId = `${Date.now()}-${Math.random()}`;
      console.log(`[App] Starting auto-download check (ID: ${downloadId})`);

      invoke("auto_download_recommended_model")
        .then(() => {
          console.log(
            `[App] Auto-download check completed (ID: ${downloadId})`,
          );
        })
        .catch((error) => {
          console.error(
            `[App] Failed to auto-download recommended model (ID: ${downloadId}):`,
            error,
          );
        });
    }, 1000);

    console.log("[App] ✅ Application initialized successfully");
    options?.onUpdateStatus?.("Application ready");
  } catch (error) {
    console.error("[App] ❌ Failed to initialize application:", error);
    options?.onUpdateStatus?.("Initialization failed");
    throw error;
  }
}
