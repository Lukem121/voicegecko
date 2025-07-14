import { useEffect } from "react";

import { initializeTauriEvents } from "~/lib/tauri-events";

export function TauriEvents() {
  useEffect(() => {
    // Initialize Tauri event listeners once
    initializeTauriEvents().catch((error) => {
      console.error("[TauriEvents] Failed to initialize:", error);
    });
  }, []);

  return null;
}
