import type { ShortcutEvent } from "@tauri-apps/plugin-global-shortcut";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { toast } from "sonner";

import { useRecordingStore } from "~/hooks/use-recording-store";
import { acceleratorFromKeys, normalizeKeys } from "~/lib/shortcuts/utils";
import { useShortcutStore } from "~/lib/stores/shortcut-store";
import { invokeTranscriptionFromBuffer } from "~/lib/transcription";

export function useGlobalPushToTalk() {
  const { categories } = useShortcutStore();
  const isRecordingRef = useRef(false);
  const pushToTalkShortcut = categories
    .flatMap((c) => c.shortcuts)
    .find((s) => s.id === "push-to-talk");

  useEffect(() => {
    if (!pushToTalkShortcut?.enabled || pushToTalkShortcut.keys.length === 0) {
      return;
    }

    const normalizedKeys = normalizeKeys(pushToTalkShortcut.keys);
    const accelerator = acceleratorFromKeys(normalizedKeys);

    let unregisterFn: (() => Promise<void>) | undefined;

    const registerShortcut = async () => {
      try {
        await register(accelerator, (event: ShortcutEvent) => {
          if (event.state === "Released") {
            handleKeyUp();
          } else if (event.state === "Pressed") {
            handleKeyDown();
          }
        });

        unregisterFn = async () => {
          await unregister(accelerator);
        };
      } catch (error) {
        console.error(
          `Failed to register global shortcut: ${accelerator}`,
          error,
        );
      }
    };

    const handleKeyDown = async () => {
      if (isRecordingRef.current) return;
      isRecordingRef.current = true;

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
    };

    const handleKeyUp = async () => {
      if (!isRecordingRef.current) return;
      isRecordingRef.current = false;

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
          const audioData = await invoke<{
            samples: number[];
            sample_rate: number;
            channels: number;
          }>("stop_recording");
          await invokeTranscriptionFromBuffer(audioData);
        } catch (error) {
          console.error("Failed to stop push-to-talk recording:", error);
          toast.error("Failed to stop recording");
        }
      }
    };

    void registerShortcut();

    return () => {
      unregisterFn?.();
    };
  }, [pushToTalkShortcut]);
}
