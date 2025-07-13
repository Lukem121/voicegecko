import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";

import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from "./use-recording-store";
import { useRecordingStore } from "./use-recording-store";

const SETTINGS_VERSION = 1;
const store = new LazyStore("settings.dat");

export function useAudioSettings() {
  const {
    devices,
    selectedDevice,
    selectedSound,
    notificationTiming,
    volume,
    setDevices,
    setSelectedDevice,
    setSelectedSound,
    setNotificationTiming,
    setVolume,
  } = useRecordingStore();

  useEffect(() => {
    async function migrateAndLoadSettings() {
      const currentVersion = (await store.get<number>("version")) ?? 0;

      if (currentVersion < SETTINGS_VERSION) {
        if (currentVersion < 1) {
          const storedVolume = await store.get<number>("volume");
          if (storedVolume === undefined) {
            await store.set("volume", 1.0);
          }
          const timing =
            await store.get<NotificationTiming>("notificationTiming");
          if (timing === undefined) {
            await store.set("notificationTiming", "start_stop");
          }
        }
        await store.set("version", SETTINGS_VERSION);
        await store.save();
      }

      const savedDevice = await store.get<AudioDevice>("selectedDevice");
      if (savedDevice) setSelectedDevice(savedDevice);

      const savedSound = await store.get<NotificationSound>("selectedSound");
      if (savedSound) setSelectedSound(savedSound);

      const savedTiming =
        await store.get<NotificationTiming>("notificationTiming");
      if (savedTiming) setNotificationTiming(savedTiming);

      const savedVolume = await store.get<number>("volume");
      if (savedVolume !== undefined) {
        setVolume(savedVolume);
        void invoke("set_volume", { volume: savedVolume });
      }
    }

    async function getDevices() {
      try {
        const audioDevices = await invoke<AudioDevice[]>("list_audio_devices");
        setDevices(audioDevices);
        if (!selectedDevice && audioDevices.length > 0) {
          const defaultDevice =
            audioDevices.find((d) => d.name.includes("Default")) ??
            audioDevices[0];
          if (defaultDevice) {
            setSelectedDevice(defaultDevice);
          }
        }
      } catch (error) {
        console.error("Failed to get audio devices:", error);
      }
    }

    void migrateAndLoadSettings();
    void getDevices();
  }, [
    setDevices,
    setSelectedDevice,
    setSelectedSound,
    setNotificationTiming,
    setVolume,
    selectedDevice,
  ]);

  const handleDeviceChange = useCallback(
    (deviceName: string) => {
      const device = devices.find((d) => d.name === deviceName) ?? null;
      setSelectedDevice(device);
      void store.set("selectedDevice", device);
    },
    [devices, setSelectedDevice],
  );

  const handleSoundChange = useCallback(
    (sound: NotificationSound) => {
      setSelectedSound(sound);
      void store.set("selectedSound", sound);
    },
    [setSelectedSound],
  );

  const handleTimingChange = useCallback(
    (timing: NotificationTiming) => {
      setNotificationTiming(timing);
      void store.set("notificationTiming", timing);
    },
    [setNotificationTiming],
  );

  const handleVolumeChange = useCallback(
    (newVolume: number[]) => {
      if (newVolume[0] !== undefined) {
        const vol = newVolume[0];
        setVolume(vol);
        void store.set("volume", vol);
        void invoke("set_volume", { volume: vol });
      }
    },
    [setVolume],
  );

  const handleTestSound = useCallback(() => {
    if (notificationTiming !== "disabled") {
      void invoke("play_notification_sound", {
        soundName: `${selectedSound}.mp3`,
        variant: "Start",
      });
    }
  }, [notificationTiming, selectedSound]);

  return {
    devices,
    selectedDevice,
    selectedSound,
    notificationTiming,
    volume,
    handleDeviceChange,
    handleSoundChange,
    handleTimingChange,
    handleVolumeChange,
    handleTestSound,
  };
}
