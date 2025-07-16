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
  "audio-level": AudioLevelEvent;
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

/**
 * Audio level event for real-time audio monitoring with advanced analysis
 */
export interface AudioLevelEvent {
  level: number; // RMS level (0.0 to 1.0)
  peak: number; // Peak level (0.0 to 1.0)
  frequency_bands: number[]; // 10 frequency bands for visualization
  dominant_frequency: number; // Dominant frequency in Hz
  spectral_centroid: number; // Spectral centroid (brightness)
  spectral_rolloff: number; // Spectral rolloff (95% energy point)
  zero_crossing_rate: number; // Zero crossing rate (roughness)
  is_voice_detected: boolean; // Voice activity detection
  is_silence: boolean; // Silence detection
}
