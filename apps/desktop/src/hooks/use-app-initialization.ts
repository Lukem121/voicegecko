import { useEffect } from "react";

import { useRecordingStore } from "~/hooks/use-recording-store";
import { eventService } from "~/services/event.service";

/**
 * Hook to initialize the app with necessary event listeners
 * Call this once in your main app component
 */
export function useAppInitialization() {
  const initializeRecordingEventListeners = useRecordingStore(
    (state) => state.initializeEventListeners,
  );

  useEffect(() => {
    let mounted = true;
    let cleanupPromise: Promise<void> | null = null;

    const initialize = async () => {
      try {
        // Initialize the centralized event service (this handles all Tauri events)
        await eventService.initialize();
        console.log("[App] Centralized event service initialized successfully");

        // Initialize recording store subscriptions (this subscribes to event service)
        initializeRecordingEventListeners();
        console.log(
          "[App] Recording store event listeners initialized successfully",
        );
      } catch (error) {
        console.error("[App] Failed to initialize event listeners:", error);
      }
    };

    if (mounted) {
      initialize();
    }

    return () => {
      mounted = false;
      // Clean up the centralized event service when the component unmounts
      cleanupPromise = eventService.cleanup();
    };
  }, [initializeRecordingEventListeners]);
}
