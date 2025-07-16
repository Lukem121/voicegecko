// This function is used to initialize the app

import { invoke } from "@tauri-apps/api/core";
import { enable } from "@tauri-apps/plugin-autostart";

export async function initializeApp() {
  try {
    await enable();
    console.log("✅ Auto-start enabled successfully");
  } catch (error) {
    console.error("❌ Failed to enable auto-start:", error);
    // Don't throw the error to prevent app startup failure
  }

  // Initialize system tray
  try {
    await import("./tray");
    console.log("✅ System tray initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize system tray:", error);
    // Don't throw the error to prevent app startup failure
  }

  // Initialize gecko bar with a small delay to ensure window is ready
  setTimeout(async () => {
    try {
      const geckoBarConfig = await invoke<{ enabled: boolean }>(
        "get_gecko_bar_config",
      );

      if (geckoBarConfig.enabled) {
        await invoke("show_gecko_bar");
      }
    } catch (error) {
      console.error("Failed to initialize gecko bar:", error);
      // Don't throw the error to prevent app startup failure
    }
  }, 1000); // Wait 1 second for window to be fully initialized
}
