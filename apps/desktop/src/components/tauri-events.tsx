import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { useRecordingStore } from "~/hooks/use-recording-store";
import { useTranscription } from "~/hooks/use-transcription";

export function TauriEvents() {
  const { setStatus, setError, notificationTiming, selectedSound } =
    useRecordingStore();
  useTranscription();

  useEffect(() => {
    const unlistenState = listen<string>("recording-state-changed", (event) => {
      console.log("Recording state changed:", event.payload);
      if (event.payload === "recording" || event.payload === "idle") {
        setStatus(event.payload);
      }
    });

    const unlistenError = listen<string>("recording-error", (event) => {
      console.error("Recording error:", event.payload);
      setError(event.payload);
      setStatus("error");
    });

    const unlistenCompletion = listen<void>("transcription-completed", () => {
      if (notificationTiming === "completion") {
        void invoke("play_notification_sound", {
          soundName: `${selectedSound}.mp3`,
          variant: "Start", // Or a new 'Completion' variant if we add one
        });
      }
    });

    return () => {
      unlistenState.then((f) => f());
      unlistenError.then((f) => f());
      unlistenCompletion.then((f) => f());
    };
  }, [setStatus, setError, notificationTiming, selectedSound]);

  return null;
}
