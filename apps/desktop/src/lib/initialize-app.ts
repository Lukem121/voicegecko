// This function is used to initialize the app

import { storeRegistry } from "~/stores/store-registry";
import { initializeTauriEvents } from "./tauri-events";

/**
 * Initialize the application on startup
 * This should be called once when the main window loads
 */
export async function initializeApp(): Promise<void> {
  console.log("[App] 🚀 Initializing application...");

  try {
    // Initialize all stores through the registry
    await storeRegistry.initializeAll();

    // Initialize Tauri event listeners
    await initializeTauriEvents();

    console.log("[App] ✅ Application initialized successfully");
  } catch (error) {
    console.error("[App] ❌ Failed to initialize application:", error);
    throw error;
  }
}
