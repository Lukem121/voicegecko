import { toast } from "sonner";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { isNetworkError } from "~/hooks/auth";
import { showNoInternetNotification } from "~/lib/gecko-bar-notifications";
import { createTranscription } from "~/lib/transcription-mutations";
import { transcriptionService } from "~/services/transcription.service";
import { useConnectivityStore } from "~/stores/connectivity.store";

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
        // 1. Check API connectivity first - block transcription if API is down
        const connectivityState = useConnectivityStore.getState();

        if (!connectivityState.canSaveTranscriptions) {
          // Show gecko bar notification
          await showNoInternetNotification();

          // Show toast notification
          toast.error("No internet connection", {
            description:
              "Unable to save transcription. Please check your connection and try again.",
          });

          // Exit early - no save, no clipboard copy
          return;
        }

        // 2. Prepare transcription data

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

        // 3. Immediate user feedback (fast local operations)
        try {
          // Copy to clipboard and play sound immediately (local operations)
          await transcriptionService.handleCompletedTranscription(transcript);
          await transcriptionService.playEndSoundIfEnabled();
        } catch (error) {
          console.error("[EventStore] Failed user feedback operations:", error);
          // Even if clipboard/sound fails, still proceed with background save
        }

        // 4. Background database save (don't block user)
        createTranscription(transcriptionData)
          .then(() => {
            // Database save successful - silent success
          })
          .catch((error) => {
            // Handle different types of errors in background
            if (
              error instanceof Error &&
              error.message.includes("limit exceeded")
            ) {
              // Usage limit error - show notification but don't disrupt user
              toast.error("Weekly usage limit reached", {
                description:
                  "Future transcriptions may be limited. Upgrade to Pro for unlimited access.",
              });
            } else if (isNetworkError(error)) {
              // Network connectivity error - refresh connectivity state for next transcription
              connectivityState.checkConnectivity();
            } else {
              // Other unexpected errors - log but don't disrupt user
              console.error("Background save error:", error);
            }
          });

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
