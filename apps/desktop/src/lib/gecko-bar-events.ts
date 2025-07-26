import { listen } from "@tauri-apps/api/event";

import type {
  AudioLevelEvent,
  GeckoBarNotificationEvent,
} from "~/types/events";
import { useGeckoBarNotificationStore } from "~/stores/gecko-bar-notification.store";

let initialized = false;

/**
 * Initialize Tauri event listeners specifically for the Gecko Bar window.
 * This only listens to events needed for UI updates, not business logic.
 */
export async function initializeGeckoBarEvents(): Promise<void> {
  if (initialized) {
    console.log("[GeckoBarEvents] ⚠️ Already initialized, skipping...");
    return;
  }

  initialized = true;
  console.log("[GeckoBarEvents] 🚀 Initializing Gecko Bar event listeners...");

  try {
    // Listen for audio level events (for visualizer)
    await listen("audio-level", (event) => {
      const payload = event.payload as AudioLevelEvent;
      // Emit to any components that need real-time audio levels
      window.dispatchEvent(new CustomEvent("audio-level", { detail: payload }));
    });

    // Listen for gecko bar notifications
    await listen("gecko-bar-notification", (event) => {
      const payload = event.payload as GeckoBarNotificationEvent;

      // Update the notification store
      useGeckoBarNotificationStore.getState().showNotification(payload);
    });

    // NOTE: Recording state is now handled by main tauri events (initializeTauriEvents)
    // to ensure both windows stay in sync

    console.log(
      "[GeckoBarEvents] ✅ Gecko Bar event listeners initialized successfully",
    );
  } catch (error) {
    console.error(
      "[GeckoBarEvents] ❌ Failed to initialize event listeners:",
      error,
    );
    initialized = false;
    throw error;
  }
}
