import { useEffect, useState } from "react";

import type { TranscriptionState } from "~/services/event.service";
import { eventService } from "~/services/event.service";

export type TranscriptionStatus = TranscriptionState["status"];

export function useTranscription() {
  console.log("[useTranscription] Hook called");

  const [state, setState] = useState<TranscriptionState>(() => {
    const initialState = eventService.getTranscriptionState();
    console.log("[useTranscription] Initial state:", initialState);
    return initialState;
  });

  useEffect(() => {
    console.log("[useTranscription] Setting up event subscription");

    const unsubscribe = eventService.onTranscriptionStateChange((newState) => {
      console.log(
        "[useTranscription] State changed from event service:",
        newState,
      );
      setState(newState);
    });

    return () => {
      console.log("[useTranscription] Cleaning up event subscription");
      unsubscribe();
    };
  }, []);

  console.log("[useTranscription] Current state:", state);
  return state;
}
