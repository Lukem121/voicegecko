import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import { handleCompletedTranscription } from "~/lib/transcription";

export type TranscriptionStatus =
  | "idle"
  | "starting"
  | "loading_model"
  | "transcribing"
  | "complete"
  | "error";

interface TranscriptionState {
  status: TranscriptionStatus;
  transcript: string | null;
  error: string | null;
}

export function useTranscription() {
  console.log("[useTranscription] Hook called");

  const [state, setState] = useState<TranscriptionState>({
    status: "idle",
    transcript: null,
    error: null,
  });

  useEffect(() => {
    console.log("[useTranscription] useEffect mounting");
    let unlisten: UnlistenFn | undefined;

    async function setupListener() {
      console.log(
        "[useTranscription] Setting up listener for transcription-progress",
      );

      unlisten = await listen("transcription-progress", (event) => {
        const payload = event.payload as { status: string; data?: any };
        console.log("[useTranscription] Received event:", payload);

        switch (payload.status) {
          case "Starting":
            setState((prev) => ({ ...prev, status: "starting" }));
            break;
          case "LoadingModel":
            setState((prev) => ({ ...prev, status: "loading_model" }));
            break;
          case "Transcribing":
            setState((prev) => ({ ...prev, status: "transcribing" }));
            break;
          case "Complete":
            console.log(
              "[useTranscription] Complete event with data:",
              payload.data,
            );
            setState({
              status: "complete",
              transcript: payload.data,
              error: null,
            });
            void handleCompletedTranscription(payload.data);
            break;
          case "Error":
            setState({
              status: "error",
              transcript: null,
              error: payload.data,
            });
            toast.error("Transcription failed", { description: payload.data });
            break;
          default:
            console.warn(
              "[useTranscription] Unknown event status:",
              payload.status,
            );
        }
      });

      console.log("[useTranscription] Listener setup complete");
    }

    void setupListener();

    return () => {
      console.log("[useTranscription] Cleanup - unlistening");
      unlisten?.();
    };
  }, []);

  console.log("[useTranscription] Returning state:", state);
  return state;
}
