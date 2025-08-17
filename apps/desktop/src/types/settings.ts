// Centralized types for all settings-related functionality

export type NotificationSound = 'beep' | 'chime' | 'tone';
export type NotificationTiming =
  | 'start_completion'
  | 'start_stop'
  | 'completion_only'
  | 'disabled';

export type AudioDevice = {
  name: string;
  id?: string;
};
