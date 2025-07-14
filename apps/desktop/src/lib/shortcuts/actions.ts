import { useRouter } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

import type { ShortcutAction } from "~/lib/shortcuts/types";
import { useRecordingStore } from "~/hooks/use-recording-store";

// Placeholder for last transcription
let lastTranscription = "";
let lastTranscriptionId: string | null = null;
let isToggling = false;

// Router instance for navigation
let routerInstance: ReturnType<typeof useRouter> | null = null;

export function setRouterInstance(router: ReturnType<typeof useRouter> | null) {
  routerInstance = router;
}

export function setLastTranscription(text: string, id?: string) {
  lastTranscription = text;
  if (id) lastTranscriptionId = id;
}

export async function handleToggleRecording() {
  // Prevent multiple simultaneous toggles
  if (isToggling) return;

  isToggling = true;

  try {
    const { status, selectedDevice, selectedSound, notificationTiming } =
      useRecordingStore.getState();

    if (status === "idle") {
      try {
        if (notificationTiming === "start_stop") {
          await invoke("play_notification_sound", {
            soundName: `${selectedSound}.mp3`,
            variant: "Start",
          });
        }
        await invoke("start_recording", { device: selectedDevice?.name });
      } catch (error) {
        console.error("Failed to start recording:", error);
        toast.error("Failed to start recording");
      }
    } else if (status === "recording") {
      try {
        if (notificationTiming === "start_stop") {
          await invoke("play_notification_sound", {
            soundName: `${selectedSound}.mp3`,
            variant: "End",
          });
        }
        const audioPath = await invoke<string>("stop_recording");

        // TODO: Handle transcription initiation
        console.log("Stopped recording, audio at:", audioPath);
        toast.info("Recording stopped. Transcription would start here.");
      } catch (error) {
        console.error("Failed to stop recording:", error);
        toast.error("Failed to stop recording");
      }
    }
  } finally {
    // Reset the flag after a short delay to prevent accidental double-triggers
    setTimeout(() => {
      isToggling = false;
    }, 200);
  }
}

// Simple action handlers for keyboard shortcuts
export const shortcutActions: Record<
  ShortcutAction,
  () => void | Promise<void>
> = {
  "toggle-recording": handleToggleRecording,

  "paste-last-transcription": async () => {
    if (lastTranscription) {
      await writeText(lastTranscription);
      toast.success("Last transcription copied to clipboard.");
    } else {
      toast.info("No transcription available to paste.");
    }
  },

  "open-last-transcription": () => {
    if (routerInstance) {
      if (lastTranscriptionId) {
        // Navigate to specific transcription when implemented
        void routerInstance.navigate({ to: "/transcriptions" });
      } else {
        // Navigate to transcriptions list
        void routerInstance.navigate({ to: "/transcriptions" });
      }
      toast.success("Opened transcriptions");
    } else {
      toast.error("Navigation not available");
    }
  },
};
