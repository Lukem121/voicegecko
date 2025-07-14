import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import type {
  RecordingErrorEvent,
  RecordingStateChangedEvent,
  TranscriptionProgressEvent,
} from "~/types/events";
import { useEventStore } from "~/stores/event.store";

let initialized = false;

/**
 * Initialize Tauri event listeners that update the Zustand store
 * Should be called once during app startup
 */
export async function initializeTauriEvents(): Promise<void> {
  if (initialized) {
    console.log("[TauriEvents] ⚠️ Already initialized, skipping...");
    return;
  }

  initialized = true;
  console.log("[TauriEvents] 🚀 Initializing Tauri event listeners...");

  try {
    // Listen for transcription progress events
    await listen("transcription-progress", (event) => {
      const payload = event.payload as TranscriptionProgressEvent;
      console.log("[TauriEvents] 📝 Transcription progress:", payload);

      useEventStore
        .getState()
        .setTranscriptionProgress(payload.status, payload.data);
    });

    // Listen for recording state changes
    await listen("recording-state-changed", (event) => {
      const payload = event.payload as RecordingStateChangedEvent;
      console.log("[TauriEvents] 🎙️ Recording state changed:", payload);

      useEventStore.getState().setRecordingStatus(payload);
    });

    // Listen for recording errors
    await listen("recording-error", (event) => {
      const payload = event.payload as RecordingErrorEvent;
      console.log("[TauriEvents] ❌ Recording error:", payload);

      useEventStore.getState().setRecordingError(payload);
      toast.error("Recording error", { description: payload });
    });

    console.log(
      "[TauriEvents] ✅ Tauri event listeners initialized successfully",
    );
  } catch (error) {
    console.error(
      "[TauriEvents] ❌ Failed to initialize Tauri event listeners:",
      error,
    );
    initialized = false;
    throw error;
  }
}
