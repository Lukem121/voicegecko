import { create } from "zustand";

import { eventService } from "~/services/event.service";

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
  initializeEventListeners: () => void;
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

  initializeEventListeners: () => {
    console.log("[RecordingStore] Initializing event listeners");

    // Subscribe to recording state changes from the centralized event service
    const unsubscribeState = eventService.onRecordingStateChange((status) => {
      console.log(
        "[RecordingStore] Recording state changed from event service:",
        status,
      );

      set({ status });

      // Clear error when state changes successfully
      if (status !== "error") {
        set({ error: null });
      }
    });

    // Subscribe to recording errors from the centralized event service
    const unsubscribeError = eventService.onRecordingError((errorMessage) => {
      console.log(
        "[RecordingStore] Recording error from event service:",
        errorMessage,
      );

      set({
        status: "error",
        error: errorMessage,
      });
    });

    console.log("[RecordingStore] Event listeners initialized");

    // Note: In a real app, you might want to store these unsubscribe functions
    // and call them when the store is destroyed, but Zustand doesn't have a cleanup mechanism
  },
}));
