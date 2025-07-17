// This function is used to initialize the app

import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

export async function initializeApp() {
  // Initialize autostart based on saved settings
  try {
    const autostartConfig = await invoke<{ enabled: boolean }>(
      "get_autostart_config",
    );

    const isCurrentlyEnabled = await isEnabled();

    // Only update if the current state doesn't match the saved setting
    if (autostartConfig.enabled !== isCurrentlyEnabled) {
      if (autostartConfig.enabled) {
        await enable();
        console.log("✅ Auto-start enabled based on settings");
      } else {
        await disable();
        console.log("✅ Auto-start disabled based on settings");
      }
    }
  } catch (error) {
    console.error("❌ Failed to initialize auto-start:", error);
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
