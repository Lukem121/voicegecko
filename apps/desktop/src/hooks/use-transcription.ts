import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import type { TranscriptionProgressEvent } from "~/types/events";
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
        const payload = event.payload as TranscriptionProgressEvent;
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
              transcript: payload.data ?? null,
              error: null,
            });

            // Handle completion with notification
            if (payload.data) {
              handleTranscriptionComplete(payload.data);
            }
            break;
          case "Error":
            setState({
              status: "error",
              transcript: null,
              error: payload.data ?? "Unknown error",
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
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return state;
}

async function handleTranscriptionComplete(transcript: string) {
  // Handle the transcription completion (clipboard, state, notification sound, etc.)
  await handleCompletedTranscription(transcript);
}
