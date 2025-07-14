import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { useRecordingStore } from "~/hooks/use-recording-store";
import { invokeTranscriptionFromBuffer } from "~/lib/transcription";

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
      const { status } = useRecordingStore.getState();

      if (status === "idle") {
        await this.startRecording(options);
      } else if (status === "recording") {
        await this.stopRecording(options);
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
    const { status } = useRecordingStore.getState();

    if (status === "idle") {
      await this.startRecording(options);
    }
  }

  /**
   * Stop push-to-talk recording
   */
  async stopPushToTalk(options: RecordingOptions = {}): Promise<void> {
    if (!this.isPushToTalkActive) return;

    this.isPushToTalkActive = false;
    const { status } = useRecordingStore.getState();

    if (status === "recording") {
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
      await invoke("play_notification_sound", {
        soundName: `${selectedSound}.mp3`,
        variant,
      });
    } catch (error) {
      console.error("Failed to play notification sound:", error);
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
   * Play end sound if configured (called from transcription completion)
   */
  async playEndSoundIfEnabled(): Promise<void> {
    if (this.shouldPlayEndSound()) {
      await this.playNotificationSound("End");
    }
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
