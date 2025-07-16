import { emit } from "@tauri-apps/api/event";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { transcriptionService } from "~/services/transcription.service";

export interface EventState {
  // Recording state
  recordingStatus: "idle" | "recording" | "processing" | "error";
  recordingError: string | null;

  // Transcription state
  transcriptionStatus:
    | "idle"
    | "starting"
    | "loading_model"
    | "transcribing"
    | "complete"
    | "error";
  transcript: string | null;
  transcriptionError: string | null;

  // Actions (called by Tauri event handlers)
  setRecordingStatus: (
    status: "idle" | "recording" | "processing" | "error",
  ) => void;
  setRecordingError: (error: string) => void;
  setTranscriptionProgress: (status: string, data?: string) => void;
  handleTranscriptionComplete: (transcript: string) => Promise<void>;

  // Selectors (computed values)
  isRecording: () => boolean;
  isTranscribing: () => boolean;
}

export const useEventStore = create<EventState>()(
  devtools(
    (set, get) => ({
      // Initial state
      recordingStatus: "idle",
      recordingError: null,
      transcriptionStatus: "idle",
      transcript: null,
      transcriptionError: null,

      // Recording actions
      setRecordingStatus: (status) => {
        const currentStatus = get().recordingStatus;
        console.log(
          "[EventStore] 🎙️ Recording status changed:",
          currentStatus,
          "→",
          status,
        );
        set({ recordingStatus: status });

        // Clear error when status changes successfully
        if (status !== "error") {
          set({ recordingError: null });
        }
      },

      setRecordingError: (error) => {
        console.log("[EventStore] ❌ Recording error:", error);
        set({
          recordingStatus: "error",
          recordingError: error,
        });
      },

      // Transcription actions
      setTranscriptionProgress: (status, data) => {
        console.log("[EventStore] Transcription progress:", status, data);

        switch (status) {
          case "Starting":
            set({ transcriptionStatus: "starting" });
            break;
          case "LoadingModel":
            set({ transcriptionStatus: "loading_model" });
            break;
          case "Transcribing":
            set({ transcriptionStatus: "transcribing" });
            break;
          case "Complete":
            set({
              transcriptionStatus: "complete",
              transcript: data || null,
              transcriptionError: null,
            });
            break;
          case "Error":
            set({
              transcriptionStatus: "error",
              transcript: null,
              transcriptionError: data || "Unknown error",
            });

            // Emit idle state on error so gecko bar can collapse
            void emit("recording-state-changed", "idle");
            break;
        }
      },

      handleTranscriptionComplete: async (transcript) => {
        console.log(
          "[EventStore] Handling transcription completion:",
          transcript,
        );

        try {
          // Handle transcription completion (clipboard, state management)
          await transcriptionService.handleCompletedTranscription(transcript);

          // Play notification sound if enabled
          await transcriptionService.playEndSoundIfEnabled();

          // Emit idle state so gecko bar knows transcription is complete
          await emit("recording-state-changed", "idle");

          console.log(
            "[EventStore] Transcription completion handled successfully",
          );
        } catch (error) {
          console.error(
            "[EventStore] Error handling transcription completion:",
            error,
          );
        }
      },

      // Selectors
      isRecording: () => get().recordingStatus === "recording",
      isTranscribing: () => {
        const status = get().transcriptionStatus;
        return status === "loading_model" || status === "transcribing";
      },
    }),
    {
      name: "event-store",
    },
  ),
);
