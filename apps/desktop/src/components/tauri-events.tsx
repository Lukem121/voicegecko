import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { useRecordingStore } from "~/hooks/use-recording-store";

export function TauriEvents() {
  const { setStatus, setError } = useRecordingStore();

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

    return () => {
      unlistenState.then((f) => f());
      unlistenError.then((f) => f());
    };
  }, [setStatus, setError]);

  return null;
}
