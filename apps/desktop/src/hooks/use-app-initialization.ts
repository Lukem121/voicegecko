import { useEffect } from "react";

import { useRecordingStore } from "~/hooks/use-recording-store";

/**
 * Hook to initialize the app with necessary event listeners
 * Call this once in your main app component
 */
export function useAppInitialization() {
  const initializeEventListeners = useRecordingStore(
    (state) => state.initializeEventListeners,
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await initializeEventListeners();
        console.log("[App] Event listeners initialized successfully");
      } catch (error) {
        console.error("[App] Failed to initialize event listeners:", error);
      }
    };

    if (mounted) {
      initialize();
    }

    return () => {
      mounted = false;
    };
  }, [initializeEventListeners]);
}
