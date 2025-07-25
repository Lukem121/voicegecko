import { toast } from "sonner";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createTranscription } from "~/lib/transcription-mutations";
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
  transcriptionMetadata: {
    duration_seconds?: number;
    model_used?: string;
    sample_rate?: number;
  } | null;

  // Actions (called by Tauri event handlers)
  setRecordingStatus: (
    status: "idle" | "recording" | "processing" | "error",
  ) => void;
  setRecordingError: (error: string) => void;
  setTranscriptionProgress: (
    status: string,
    data?: string,
    metadata?: {
      duration_seconds?: number;
      model_used?: string;
      sample_rate?: number;
    },
  ) => void;
  handleTranscriptionComplete: (
    transcript: string,
    metadata?: {
      duration_seconds?: number;
      model_used?: string;
      sample_rate?: number;
    },
  ) => Promise<void>;

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
      transcriptionMetadata: null,

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
      setTranscriptionProgress: (status, data, metadata) => {
        console.log(
          "[EventStore] Transcription progress:",
          status,
          data,
          metadata,
        );

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
              transcript: data ?? null,
              transcriptionError: null,
              transcriptionMetadata: metadata ?? null,
              // Also set recording status to idle when transcription completes
              recordingStatus: "idle",
            });
            break;
          case "Error":
            set({
              transcriptionStatus: "error",
              transcript: null,
              transcriptionError: data ?? "Unknown error",
              transcriptionMetadata: null,
              // Also set recording status to idle on error
              recordingStatus: "idle",
            });
            break;
        }
      },

      handleTranscriptionComplete: async (transcript: string, metadata) => {
        console.log(
          "[EventStore] 📝 Transcription complete event received:",
          transcript,
          metadata,
        );

        // Handle the transcription through the service
        await transcriptionService.handleCompletedTranscription(transcript);

        // Play notification sound if enabled
        await transcriptionService.playEndSoundIfEnabled();

        // Save transcription to database
        console.log(
          "[EventStore] 💾 Attempting to save transcription to database...",
        );
        console.log("[EventStore] 📝 Transcript content:", transcript);
        console.log("[EventStore] 📊 Metadata:", metadata);

        try {
          const status: "silent" | "normal" =
            !transcript.trim() ||
            (metadata?.duration_seconds && metadata.duration_seconds < 1)
              ? "silent"
              : "normal";
          const content = status === "silent" ? "Audio is silent." : transcript;

          const transcriptionData = {
            content,
            status,
            durationSeconds:
              Number.isFinite(metadata?.duration_seconds) &&
              metadata?.duration_seconds !== undefined
                ? Math.trunc(metadata.duration_seconds)
                : undefined,
            modelUsed: metadata?.model_used,
            sampleRate: metadata?.sample_rate,
            // TODO: Get app version
            // appVersion: undefined,
          };

          console.log(
            "[EventStore] 🚀 Calling createTranscription with data:",
            transcriptionData,
          );

          await createTranscription(transcriptionData);

          console.log(
            "[EventStore] ✅ Transcription saved to database successfully",
          );
        } catch (error) {
          console.error("[EventStore] ❌ Failed to save transcription:", error);

          // Check if it's a usage limit error
          if (
            error instanceof Error &&
            error.message.includes("limit exceeded")
          ) {
            toast.error("Weekly usage limit reached", {
              description:
                "Your transcription was copied to clipboard but not saved. Upgrade to Pro for unlimited transcriptions.",
            });
          }
          // Don't throw - we already copied to clipboard, so the user has their transcription
        }

        // Recording status is now set to idle in setTranscriptionProgress when Complete status is received
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
