// This function is used to initialize the app

import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

import { storeRegistry } from "~/stores/store-registry";
import { initializeTauriEvents } from "./tauri-events";

export interface InitializeOptions {
  onUpdateStatus?: (status: string) => void;
  onUpdateProgress?: (progress: number) => void;
}

/**
 * Check for updates and automatically install them if available
 */
async function checkAndInstallUpdates(
  options?: InitializeOptions,
): Promise<void> {
  console.log("[App] 🔍 Checking for updates...");
  options?.onUpdateStatus?.("Checking for updates...");

  try {
    const update = await check();

    if (update) {
      const isCritical = update.rawJson.critical === true;
      console.log("[App] 📦 Update found:", {
        version: update.version,
        critical: isCritical,
      });

      options?.onUpdateStatus?.(`Update found: ${update.version}`);
      console.log("[App] 📥 Starting automatic update download...");
      options?.onUpdateStatus?.("Downloading update...");

      let contentLength = 0;
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            console.log("[App] 📥 Download started, size:", contentLength);
            options?.onUpdateProgress?.(0);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const progress = Math.round((downloaded / contentLength) * 100);
              options?.onUpdateProgress?.(progress);
              if (progress % 10 === 0) {
                // Log every 10% to avoid spam
                console.log(`[App] 📥 Download progress: ${progress}%`);
              }
            }
            break;
          case "Finished":
            console.log("[App] ✅ Download completed, installing...");
            options?.onUpdateStatus?.("Installing update...");
            options?.onUpdateProgress?.(100);
            break;
        }
      });

      console.log("[App] 🔄 Update installed successfully, relaunching...");
      options?.onUpdateStatus?.("Restarting application...");
      await relaunch();
    } else {
      console.log("[App] ✅ No updates available");
      options?.onUpdateStatus?.("No updates available");
    }
  } catch (error) {
    console.error("[App] ❌ Update check failed:", error);
    options?.onUpdateStatus?.("Update check failed");
    // Don't fail app initialization if update check fails
    // Just log the error and continue
  }
}

/**
 * Initialize the application on startup
 * This should be called once when the main window loads
 */
export async function initializeApp(
  options?: InitializeOptions,
): Promise<void> {
  console.log("[App] 🚀 Initializing application...");

  try {
    // Check for updates first during launch
    await checkAndInstallUpdates(options);

    // Initialize all stores through the registry
    options?.onUpdateStatus?.("Initializing application...");
    await storeRegistry.initializeAll();

    // Initialize Tauri event listeners
    await initializeTauriEvents();

    console.log("[App] ✅ Application initialized successfully");
    options?.onUpdateStatus?.("Application ready");
  } catch (error) {
    console.error("[App] ❌ Failed to initialize application:", error);
    options?.onUpdateStatus?.("Initialization failed");
    throw error;
  }
}
