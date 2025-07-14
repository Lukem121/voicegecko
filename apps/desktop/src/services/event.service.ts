import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import type {
  RecordingErrorEvent,
  RecordingStateChangedEvent,
  TranscriptionProgressEvent,
} from "~/types/events";
import { recordingService } from "~/services/recording.service";
import { transcriptionService } from "~/services/transcription.service";

export interface TranscriptionState {
  status:
    | "idle"
    | "starting"
    | "loading_model"
    | "transcribing"
    | "complete"
    | "error";
  transcript: string | null;
  error: string | null;
}

type TranscriptionCallback = (state: TranscriptionState) => void;
type RecordingStateCallback = (
  status: "idle" | "recording" | "processing" | "error",
) => void;
type RecordingErrorCallback = (error: string) => void;

export class EventService {
  private static instance: EventService | undefined;
  private initialized = false;
  private unlistenFunctions: UnlistenFn[] = [];

  // Callbacks for different events
  private transcriptionCallbacks = new Set<TranscriptionCallback>();
  private recordingStateCallbacks = new Set<RecordingStateCallback>();
  private recordingErrorCallbacks = new Set<RecordingErrorCallback>();

  // Current state
  private transcriptionState: TranscriptionState = {
    status: "idle",
    transcript: null,
    error: null,
  };

  private constructor() {}

  public static getInstance(): EventService {
    EventService.instance ??= new EventService();
    return EventService.instance;
  }

  /**
   * Initialize event listeners (should be called once during app startup)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn("[EventService] Already initialized, skipping...");
      return;
    }

    this.initialized = true;
    console.log("[EventService] Initializing event listeners...");

    try {
      // Listen for transcription progress events
      const transcriptionUnlisten = await listen(
        "transcription-progress",
        async (event) => {
          await this.handleTranscriptionProgress(
            event.payload as TranscriptionProgressEvent,
          );
        },
      );
      this.unlistenFunctions.push(transcriptionUnlisten);

      // Listen for recording state changes
      const recordingStateUnlisten = await listen(
        "recording-state-changed",
        (event) => {
          this.handleRecordingStateChanged(
            event.payload as RecordingStateChangedEvent,
          );
        },
      );
      this.unlistenFunctions.push(recordingStateUnlisten);

      // Listen for recording errors
      const recordingErrorUnlisten = await listen(
        "recording-error",
        (event) => {
          this.handleRecordingError(event.payload as RecordingErrorEvent);
        },
      );
      this.unlistenFunctions.push(recordingErrorUnlisten);

      console.log("[EventService] Event listeners initialized successfully");
    } catch (error) {
      console.error(
        "[EventService] Failed to initialize event listeners:",
        error,
      );
      throw error;
    }
  }

  /**
   * Clean up all event listeners
   */
  async cleanup(): Promise<void> {
    console.log("[EventService] Cleaning up event listeners...");

    for (const unlisten of this.unlistenFunctions) {
      try {
        await unlisten();
      } catch (error) {
        console.error("[EventService] Failed to unlisten:", error);
      }
    }

    this.unlistenFunctions = [];
    this.transcriptionCallbacks.clear();
    this.recordingStateCallbacks.clear();
    this.recordingErrorCallbacks.clear();
    this.initialized = false;

    console.log("[EventService] Cleanup completed");
  }

  /**
   * Subscribe to transcription state changes
   */
  onTranscriptionStateChange(callback: TranscriptionCallback): () => void {
    this.transcriptionCallbacks.add(callback);

    // Immediately call with current state
    callback(this.transcriptionState);

    // Return unsubscribe function
    return () => {
      this.transcriptionCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to recording state changes
   */
  onRecordingStateChange(callback: RecordingStateCallback): () => void {
    this.recordingStateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.recordingStateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to recording errors
   */
  onRecordingError(callback: RecordingErrorCallback): () => void {
    this.recordingErrorCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.recordingErrorCallbacks.delete(callback);
    };
  }

  /**
   * Get current transcription state
   */
  getTranscriptionState(): TranscriptionState {
    return { ...this.transcriptionState };
  }

  /**
   * Handle transcription progress events
   */
  private async handleTranscriptionProgress(
    payload: TranscriptionProgressEvent,
  ): Promise<void> {
    console.log("[EventService] Transcription progress:", payload);

    switch (payload.status) {
      case "Starting":
        this.transcriptionState = {
          ...this.transcriptionState,
          status: "starting",
        };
        break;
      case "LoadingModel":
        this.transcriptionState = {
          ...this.transcriptionState,
          status: "loading_model",
        };
        break;
      case "Transcribing":
        this.transcriptionState = {
          ...this.transcriptionState,
          status: "transcribing",
        };
        break;
      case "Complete":
        this.transcriptionState = {
          status: "complete",
          transcript: payload.data ?? null,
          error: null,
        };

        // Handle completion - this should only happen once per transcription
        if (payload.data) {
          console.log(
            "[EventService] 🎯 Handling transcription completion once",
          );
          console.log("[EventService] 📝 Transcript:", payload.data);
          console.log(
            "[EventService] 🔄 Current state after setting transcript:",
            this.transcriptionState,
          );

          // Handle transcription completion (clipboard, state management)
          await transcriptionService.handleCompletedTranscription(payload.data);

          // Play notification sound if enabled
          console.log("[EventService] 🙏 Playing notification sound");
          try {
            await recordingService.playEndSoundIfEnabled();
            console.log(
              "[EventService] ✅ Notification sound played successfully",
            );
          } catch (error) {
            console.error(
              "[EventService] ❌ Failed to play notification sound:",
              error,
            );
          }
        }
        break;
      case "Error":
        this.transcriptionState = {
          status: "error",
          transcript: null,
          error: payload.data ?? "Unknown error",
        };
        toast.error("Transcription failed", { description: payload.data });
        break;
      default:
        console.warn(
          "[EventService] Unknown transcription status:",
          payload.status,
        );
    }

    // Notify all subscribers
    this.transcriptionCallbacks.forEach((callback) => {
      try {
        callback(this.transcriptionState);
      } catch (error) {
        console.error("[EventService] Error in transcription callback:", error);
      }
    });
  }

  /**
   * Handle recording state changes
   */
  private handleRecordingStateChanged(
    payload: RecordingStateChangedEvent,
  ): void {
    console.log("[EventService] Recording state changed:", payload);

    // Notify all subscribers - payload is already the status string
    this.recordingStateCallbacks.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[EventService] Error in recording state callback:",
          error,
        );
      }
    });
  }

  /**
   * Handle recording errors
   */
  private handleRecordingError(payload: RecordingErrorEvent): void {
    console.log("[EventService] Recording error:", payload);

    // Notify all subscribers - payload is already the error string
    this.recordingErrorCallbacks.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[EventService] Error in recording error callback:",
          error,
        );
      }
    });
  }
}

export const eventService = EventService.getInstance();
