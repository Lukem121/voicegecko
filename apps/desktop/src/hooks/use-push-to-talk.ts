import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useRecordingStore } from "~/hooks/use-recording-store";
import { getOS } from "~/lib/shortcuts/utils";
import { useShortcutStore } from "~/lib/stores/shortcut-store";
import { invokeTranscription } from "~/lib/transcription";

export function usePushToTalk() {
  const { categories } = useShortcutStore();
  const isRecordingRef = useRef(false);
  const platform = getOS();

  useEffect(() => {
    const pushToTalkShortcut = categories
      .flatMap((c) => c.shortcuts)
      .find((s) => s.id === "push-to-talk");

    if (!pushToTalkShortcut?.enabled) {
      return;
    }

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Prevent multiple keydown events while holding
      if (event.repeat || isRecordingRef.current) return;

      const normalizedKeys = pushToTalkShortcut.keys.map((k) => {
        const lower = k.toLowerCase();
        // Handle CommandOrControl based on platform
        if (lower === "commandorcontrol") {
          return platform === "macos" ? "meta" : "control";
        }
        return lower;
      });

      const pressed = new Set<string>();
      if (event.metaKey) pressed.add("meta");
      if (event.ctrlKey) pressed.add("control");
      if (event.altKey) pressed.add("alt");
      if (event.shiftKey) pressed.add("shift");

      const eventKey = event.key.toLowerCase();
      if (!["control", "alt", "shift", "meta"].includes(eventKey)) {
        pressed.add(eventKey === " " ? "space" : eventKey);
      }

      const allKeysPressed = normalizedKeys.every((key) => pressed.has(key));

      if (allKeysPressed && pressed.size === normalizedKeys.length) {
        isRecordingRef.current = true;

        // Start recording
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
            console.error("Failed to start push-to-talk recording:", error);
            toast.error("Failed to start recording");
            isRecordingRef.current = false;
          }
        }
      }
    };

    const handleKeyUp = async (event: KeyboardEvent) => {
      if (!isRecordingRef.current) return;

      const normalizedKeys = pushToTalkShortcut.keys.map((k) => {
        const lower = k.toLowerCase();
        if (lower === "commandorcontrol") {
          return platform === "macos" ? "meta" : "control";
        }
        return lower;
      });

      const eventKey = event.key.toLowerCase();
      let releasedKey = eventKey;

      if (eventKey === " ") releasedKey = "space";
      else if (eventKey === "meta") releasedKey = "meta";
      else if (eventKey === "control") releasedKey = "control";

      if (normalizedKeys.includes(releasedKey)) {
        isRecordingRef.current = false;

        // Stop recording
        const { status, selectedSound, notificationTiming } =
          useRecordingStore.getState();

        if (status === "recording") {
          try {
            if (notificationTiming === "start_stop") {
              await invoke("play_notification_sound", {
                soundName: `${selectedSound}.mp3`,
                variant: "End",
              });
            }
            const audioPath = await invoke<string>("stop_recording");
            await invokeTranscription(audioPath);
          } catch (error) {
            console.error("Failed to stop push-to-talk recording:", error);
            toast.error("Failed to stop recording");
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [categories, platform]);
}
