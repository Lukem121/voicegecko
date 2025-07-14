/**
 * Tauri Event Type Definitions
 * These types ensure type safety for all events emitted by the Tauri backend
 */

export interface TauriEventMap {
  "transcription-progress": TranscriptionProgressEvent;
  "recording-state-changed": RecordingStateChangedEvent;
  "recording-error": RecordingErrorEvent;
  "model-download-progress": ModelDownloadProgressEvent;
  "model-download-complete": ModelDownloadCompleteEvent;
  "model-delete-complete": ModelDeleteCompleteEvent;
}

export interface TranscriptionProgressEvent {
  status: "Starting" | "LoadingModel" | "Transcribing" | "Complete" | "Error";
  data?: string;
}

// Backend sends raw string, not an object
export type RecordingStateChangedEvent =
  | "idle"
  | "recording"
  | "processing"
  | "error";

// Backend sends raw string, not an object
export type RecordingErrorEvent = string;

export interface ModelDownloadProgressEvent {
  modelId: string;
  progress: number;
}

export interface ModelDownloadCompleteEvent {
  modelId: string;
}

export interface ModelDeleteCompleteEvent {
  modelId: string;
}

/**
 * Type-safe event listener function
 */
export type TauriEventCallback<T extends keyof TauriEventMap> = (event: {
  payload: TauriEventMap[T];
}) => void;

/**
 * Audio data structure from Tauri backend
 */
export interface AudioData {
  samples: number[];
  sample_rate: number;
  channels: number;
}

/**
 * Sound variant for notification sounds
 */
export type SoundVariant = "Start" | "End";
