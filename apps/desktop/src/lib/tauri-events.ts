import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import type {
  AudioData,
  AudioLevelEvent,
  RecordingErrorEvent,
  RecordingStateChangedEvent,
  TranscriptionProgressEvent,
} from "~/types/events";
import { transcriptionService } from "~/services/transcription.service";
import { useEventStore } from "~/stores/event.store";
import { queryClient, trpc, trpcClient } from "~/trpc";

let initialized = false;
let initializationId: string | null = null;

interface InitializeOptions {
  isGeckoBar?: boolean;
}

/**
 * Initialize Tauri event listeners that update the Zustand store
 * Should be called once during app startup
 */
export async function initializeTauriEvents(
  options: InitializeOptions = {},
): Promise<void> {
  const callerId = `${Date.now()}-${Math.random()}`;
  console.log(`[TauriEvents] Initialization attempt with ID: ${callerId}`);

  if (initialized) {
    console.log(
      `[TauriEvents] ⚠️ Already initialized by ${initializationId}, skipping (attempted by ${callerId})...`,
    );
    return;
  }

  initialized = true;
  initializationId = callerId;
  console.log(
    `[TauriEvents] 🚀 Initializing Tauri event listeners (ID: ${callerId})...`,
  );

  try {
    // Listen for transcription progress events (always needed for UI state)
    await listen("transcription-progress", (event) => {
      const payload = event.payload as TranscriptionProgressEvent;
      console.log("[TauriEvents] 📝 Transcription progress:", payload);

      const store = useEventStore.getState();
      const metadata = {
        duration_seconds: payload.duration_seconds,
        model_used: payload.model_used,
        sample_rate: payload.sample_rate,
      };

      store.setTranscriptionProgress(payload.status, payload.data, metadata);

      // Only handle completion business logic in main window
      if (
        !options.isGeckoBar &&
        payload.status === "Complete" &&
        payload.data
      ) {
        console.log(
          "[TauriEvents] Handling transcription completion in main window",
        );
        void store.handleTranscriptionComplete(payload.data, metadata);
      }
    });

    // Listen for recording state changes
    await listen("recording-state-changed", (event) => {
      const payload = event.payload as RecordingStateChangedEvent;
      console.log("[TauriEvents] 🎙️ Recording state changed:", payload);

      useEventStore.getState().setRecordingStatus(payload);
    });

    // Listen for cloud transcription requests
    await listen("cloud-transcription-requested", async (event) => {
      const audioData = event.payload as AudioData;
      console.log("[TauriEvents] ☁️ Cloud transcription requested", {
        samplesLength: audioData.samples.length,
        sampleRate: audioData.sample_rate,
      });

      try {
        // Update UI to show transcribing state
        const store = useEventStore.getState();
        store.setTranscriptionProgress("Transcribing");

        // Call the cloud transcription API
        const result = await trpcClient.transcription.cloudTranscribe.mutate({
          audioData: Array.from(audioData.samples),
          sampleRate: audioData.sample_rate,
        });

        // Directly update the store instead of emitting an event that we'll catch ourselves
        const metadata = {
          duration_seconds: audioData.samples.length / audioData.sample_rate,
          model_used: result.modelUsed,
          sample_rate: audioData.sample_rate,
        };

        // Update transcription progress to complete
        store.setTranscriptionProgress("Complete", result.transcript, metadata);

        // Handle completion business logic only if not in gecko bar
        if (!options.isGeckoBar && result.transcript) {
          // For cloud transcriptions, the backend already saved the transcription
          // So we only need to handle clipboard and play notification sound
          await transcriptionService.handleCompletedTranscription(
            result.transcript,
          );
          await transcriptionService.playEndSoundIfEnabled();

          // Invalidate queries to update UI
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: trpc.transcription.getAll.queryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: trpc.usage.getStatus.queryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: trpc.usage.getStats.queryKey(),
            }),
          ]);
        }
      } catch (error) {
        console.error("[TauriEvents] Cloud transcription error:", error);

        // Update error state directly
        const store = useEventStore.getState();
        store.setTranscriptionProgress(
          "Error",
          error instanceof Error ? error.message : "Cloud transcription failed",
        );

        toast.error("Cloud transcription failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Listen for recording errors
    await listen("recording-error", (event) => {
      const payload = event.payload as RecordingErrorEvent;
      console.log("[TauriEvents] ❌ Recording error:", payload);

      useEventStore.getState().setRecordingError(payload);
      toast.error("Recording error", { description: payload });
    });

    // Listen for audio level events
    await listen("audio-level", (event) => {
      const payload = event.payload as AudioLevelEvent;
      // Emit to any components that need real-time audio levels
      window.dispatchEvent(new CustomEvent("audio-level", { detail: payload }));
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
