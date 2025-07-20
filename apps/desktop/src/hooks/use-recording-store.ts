import { create } from "zustand";

export type NotificationSound = "beep" | "chime" | "tone";
export type NotificationTiming =
  | "start_completion"
  | "start_stop"
  | "completion_only"
  | "disabled";

export interface AudioDevice {
  name: string;
}

interface RecordingSettingsState {
  // Audio settings
  devices: AudioDevice[];
  selectedDevice: AudioDevice | null;
  selectedSound: NotificationSound;
  notificationTiming: NotificationTiming;
  volume: number;
  muteSystemAudio: boolean;

  // Actions
  setDevices: (devices: AudioDevice[]) => void;
  setSelectedDevice: (device: AudioDevice | null) => void;
  setSelectedSound: (sound: NotificationSound) => void;
  setNotificationTiming: (timing: NotificationTiming) => void;
  setVolume: (volume: number) => void;
  setMuteSystemAudio: (mute: boolean) => void;
}

export const useRecordingStore = create<RecordingSettingsState>((set) => ({
  // Audio settings
  devices: [],
  selectedDevice: null,
  selectedSound: "chime",
  notificationTiming: "start_completion",
  volume: 1.0,
  muteSystemAudio: true, // Default to true as per requirement

  // Actions
  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setSelectedSound: (sound) => set({ selectedSound: sound }),
  setNotificationTiming: (timing) => set({ notificationTiming: timing }),
  setVolume: (volume) => set({ volume }),
  setMuteSystemAudio: (mute) => set({ muteSystemAudio: mute }),
}));
