import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";

import type {
  RecordingErrorEvent,
  RecordingStateChangedEvent,
} from "~/types/events";

export type RecordingStatus = "idle" | "recording" | "processing" | "error";
export type NotificationSound = "beep" | "chime" | "tone";
export type NotificationTiming = "start_stop" | "completion" | "disabled";

export interface AudioDevice {
  name: string;
}

interface RecordingState {
  status: RecordingStatus;
  devices: AudioDevice[];
  selectedDevice: AudioDevice | null;
  selectedSound: NotificationSound;
  notificationTiming: NotificationTiming;
  volume: number;
  error: string | null;
  setStatus: (status: RecordingStatus) => void;
  setDevices: (devices: AudioDevice[]) => void;
  setSelectedDevice: (device: AudioDevice | null) => void;
  setSelectedSound: (sound: NotificationSound) => void;
  setNotificationTiming: (timing: NotificationTiming) => void;
  setVolume: (volume: number) => void;
  setError: (error: string | null) => void;
  initializeEventListeners: () => Promise<void>;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  status: "idle",
  devices: [],
  selectedDevice: null,
  selectedSound: "chime",
  notificationTiming: "start_stop",
  volume: 1.0,
  error: null,
  setStatus: (status) => set({ status }),
  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setSelectedSound: (sound) => set({ selectedSound: sound }),
  setNotificationTiming: (timing) => set({ notificationTiming: timing }),
  setVolume: (volume) => set({ volume }),
  setError: (error) => set({ error }),

  initializeEventListeners: async () => {
    // Listen for recording state changes from the backend
    await listen("recording-state-changed", (event) => {
      const payload = event.payload as RecordingStateChangedEvent;
      console.log("[RecordingStore] Recording state changed:", payload);

      set({ status: payload.status });

      // Clear error when state changes successfully
      if (payload.status !== "error") {
        set({ error: null });
      }
    });

    // Listen for recording errors from the backend
    await listen("recording-error", (event) => {
      const payload = event.payload as RecordingErrorEvent;
      console.log("[RecordingStore] Recording error:", payload);

      set({
        status: "error",
        error: payload.error,
      });
    });
  },
}));
