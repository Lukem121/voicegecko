import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

import { useSettingsStore } from "~/stores/settings.store";
import { recordingService } from "./recording.service";

export class TranscriptionService {
  private static instance: TranscriptionService | undefined;
  private lastTranscription = "";
  private lastTranscriptionId: string | null = null;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  public static getInstance(): TranscriptionService {
    TranscriptionService.instance ??= new TranscriptionService();
    return TranscriptionService.instance;
  }

  /**
   * Set the last transcription text and optional ID
   */
  setLastTranscription(text: string, id?: string): void {
    this.lastTranscription = text;
    if (id) {
      this.lastTranscriptionId = id;
    }
  }

  /**
   * Get the last transcription text
   */
  getLastTranscription(): string {
    return this.lastTranscription;
  }

  /**
   * Get the last transcription ID
   */
  getLastTranscriptionId(): string | null {
    return this.lastTranscriptionId;
  }

  /**
   * Paste the last transcription to clipboard
   */
  async pasteLastTranscription(): Promise<void> {
    if (this.lastTranscription) {
      await writeText(this.lastTranscription);
      toast.success("Last transcription copied to clipboard.");
    } else {
      toast.info("No transcription available to paste.");
    }
  }

  /**
   * Handle completed transcription with clipboard and state management
   */
  async handleCompletedTranscription(transcript: string): Promise<void> {
    console.log(
      "[TranscriptionService] Handling completed transcription:",
      transcript,
    );

    if (transcript) {
      try {
        // Update internal state
        this.setLastTranscription(transcript);

        // Copy to clipboard
        await writeText(transcript);

        // Show success toast
        toast.success("Transcription complete and copied to clipboard!");
      } catch (error) {
        console.error(
          "[TranscriptionService] Failed to copy to clipboard:",
          error,
        );
        toast.error("Failed to copy to clipboard", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } else {
      console.warn("[TranscriptionService] Empty transcript received");
      toast.warning("Transcription returned an empty result.");
    }
  }

  /**
   * Play end notification sound if enabled according to user settings
   */
  async playEndSoundIfEnabled(): Promise<void> {
    try {
      const { settings } = useSettingsStore.getState();
      const notificationTiming = settings.audio.notificationTiming;

      // Play end sound on transcription completion for "completion_only" and "start_completion" timings
      // "start_stop" timing plays sounds when recording starts/stops, not on transcription
      if (
        notificationTiming === "completion_only" ||
        notificationTiming === "start_completion"
      ) {
        console.log("[TranscriptionService] Playing end notification sound");
        await recordingService.playNotificationSound("End");
        console.log("[TranscriptionService] ✅ End sound played successfully");
      } else {
        console.log("[TranscriptionService] End sound disabled by settings");
      }
    } catch (error) {
      console.error(
        "[TranscriptionService] ❌ Failed to play end sound:",
        error,
      );
      // Don't throw - notification sound failure shouldn't stop transcription completion
    }
  }

  /**
   * Open last transcription (placeholder for future functionality)
   */
  openLastTranscription(): void {
    toast.success("Opened transcriptions");
  }
}

export const transcriptionService = TranscriptionService.getInstance();
