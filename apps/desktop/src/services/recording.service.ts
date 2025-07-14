import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useRecordingStore } from "~/hooks/use-recording-store";
import { invokeTranscriptionFromBuffer } from "~/lib/transcription";
import { useEventStore } from "~/stores/event.store";

export interface RecordingOptions {
  playStartSound?: boolean;
  playEndSound?: boolean;
  device?: string;
}

export class RecordingService {
  private static instance: RecordingService | undefined;
  private isToggling = false;
  private isPushToTalkActive = false;

  private constructor() {}

  public static getInstance(): RecordingService {
    RecordingService.instance ??= new RecordingService();
    return RecordingService.instance;
  }

  /**
   * Toggle recording on/off
   */
  async toggleRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isToggling) return;

    this.isToggling = true;

    try {
      const { recordingStatus } = useEventStore.getState();

      console.log(
        "[RecordingService] Toggle recording called, current status:",
        recordingStatus,
      );

      if (recordingStatus === "idle") {
        console.log("[RecordingService] Starting recording...");
        await this.startRecording(options);
      } else if (recordingStatus === "recording") {
        console.log("[RecordingService] Stopping recording...");
        await this.stopRecording(options);
      } else if (recordingStatus === "processing") {
        console.log(
          "[RecordingService] Recording is processing, ignoring toggle",
        );
      }
      {
        console.log(
          "[RecordingService] Recording in error state, attempting to start...",
        );
        await this.startRecording(options);
      }
    } finally {
      setTimeout(() => {
        this.isToggling = false;
      }, 200);
    }
  }

  /**
   * Start push-to-talk recording
   */
  async startPushToTalk(options: RecordingOptions = {}): Promise<void> {
    if (this.isPushToTalkActive) return;

    this.isPushToTalkActive = true;
    const { recordingStatus } = useEventStore.getState();

    if (recordingStatus === "idle") {
      await this.startRecording(options);
    }
  }

  /**
   * Stop push-to-talk recording
   */
  async stopPushToTalk(options: RecordingOptions = {}): Promise<void> {
    if (!this.isPushToTalkActive) return;

    this.isPushToTalkActive = false;
    const { recordingStatus } = useEventStore.getState();

    if (recordingStatus === "recording") {
      await this.stopRecording(options);
    }
  }

  /**
   * Start recording with proper error handling and notifications
   */
  private async startRecording(options: RecordingOptions): Promise<void> {
    try {
      const { selectedDevice } = useRecordingStore.getState();
      const deviceName = options.device ?? selectedDevice?.name;

      if (options.playStartSound ?? this.shouldPlayStartSound()) {
        await this.playNotificationSound("Start");
      }

      await invoke("start_recording", { device: deviceName });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start recording");
      throw error;
    }
  }

  /**
   * Stop recording with proper error handling and transcription
   */
  private async stopRecording(options: RecordingOptions): Promise<void> {
    try {
      const audioData = await invoke<{
        samples: number[];
        sample_rate: number;
        channels: number;
      }>("stop_recording");

      await invokeTranscriptionFromBuffer(audioData);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop recording");
      throw error;
    }
  }

  /**
   * Play notification sound with proper error handling
   */
  private async playNotificationSound(variant: "Start" | "End"): Promise<void> {
    try {
      const { selectedSound } = useRecordingStore.getState();
      console.log(
        `[RecordingService] Playing ${variant} sound: ${selectedSound}.mp3`,
      );

      await invoke("play_notification_sound", {
        soundName: `${selectedSound}.mp3`,
        variant,
      });

      console.log(`[RecordingService] ✅ ${variant} sound played successfully`);
    } catch (error) {
      console.error(
        `[RecordingService] ❌ Failed to play ${variant} sound:`,
        error,
      );
      // Don't throw - notification sound failure shouldn't stop recording
    }
  }

  /**
   * Determine if start sound should be played based on settings
   */
  private shouldPlayStartSound(): boolean {
    const { notificationTiming } = useRecordingStore.getState();
    return notificationTiming === "start_stop";
  }

  /**
   * Determine if end sound should be played based on settings
   */
  private shouldPlayEndSound(): boolean {
    const { notificationTiming } = useRecordingStore.getState();
    return (
      notificationTiming === "completion" || notificationTiming === "start_stop"
    );
  }

  /**
   * Reset all flags (useful for cleanup)
   */
  reset(): void {
    this.isToggling = false;
    this.isPushToTalkActive = false;
  }
}

export const recordingService = RecordingService.getInstance();
