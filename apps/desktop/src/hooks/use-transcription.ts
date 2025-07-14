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
  const [state, setState] = useState<TranscriptionState>({
    status: "idle",
    transcript: null,
    error: null,
  });

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    async function setupListener() {
      unlisten = await listen("transcription-progress", (event) => {
        const payload = event.payload as { status: string; data?: any };

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
        }
      });
    }

    void setupListener();

    return () => {
      unlisten?.();
    };
  }, []);

  return state;
}
