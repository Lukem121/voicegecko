// This function is used to initialize the app

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
}
