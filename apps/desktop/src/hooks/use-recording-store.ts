import { create } from "zustand";

export type RecordingStatus = "idle" | "recording" | "processing" | "error";
export type NotificationSound = "beep" | "chime" | "tone" | "silent";

export interface AudioDevice {
  name: string;
}

interface RecordingState {
  status: RecordingStatus;
  devices: AudioDevice[];
  selectedDevice: AudioDevice | null;
  selectedSound: NotificationSound;
  error: string | null;
  setStatus: (status: RecordingStatus) => void;
  setDevices: (devices: AudioDevice[]) => void;
  setSelectedDevice: (device: AudioDevice | null) => void;
  setSelectedSound: (sound: NotificationSound) => void;
  setError: (error: string | null) => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  status: "idle",
  devices: [],
  selectedDevice: null,
  selectedSound: "chime",
  error: null,
  setStatus: (status) => set({ status }),
  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setSelectedSound: (sound) => set({ selectedSound: sound }),
  setError: (error) => set({ error }),
}));
