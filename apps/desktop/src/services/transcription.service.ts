import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

export class TranscriptionService {
  private static instance: TranscriptionService | undefined;
  private lastTranscription = "";
  private lastTranscriptionId: string | null = null;

  private constructor() {}

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
      "[TranscriptionService] 🎯 Handling completed transcription:",
      transcript,
    );

    if (transcript) {
      try {
        // Update internal state
        this.setLastTranscription(transcript);
        console.log(
          "[TranscriptionService] 💾 Updated internal state with transcript",
        );

        // Copy to clipboard
        await writeText(transcript);
        console.log(
          "[TranscriptionService] 📋 Successfully copied to clipboard",
        );

        // Show success toast
        toast.success("Transcription complete and copied to clipboard!");
        console.log("[TranscriptionService] ✅ Success toast shown");
      } catch (error) {
        console.error(
          "[TranscriptionService] ❌ Failed to copy to clipboard:",
          error,
        );
        toast.error("Failed to copy to clipboard", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } else {
      console.warn("[TranscriptionService] ⚠️ Empty transcript received");
      toast.warning("Transcription returned an empty result.");
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
