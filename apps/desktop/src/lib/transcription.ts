import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type { AudioData } from "~/types/events";

/**
 * Invokes the transcription process on the backend using audio buffer data.
 * The transcription results will be handled by the centralized event service.
 *
 * @param audioData - The audio data including samples, sample rate, and channels.
 */
export async function invokeTranscriptionFromBuffer(audioData: AudioData) {
  console.log("[invokeTranscriptionFromBuffer] Called with audio data:", {
    samplesLength: audioData.samples.length,
    sampleRate: audioData.sample_rate,
    channels: audioData.channels,
  });

  try {
    await invoke("transcribe_audio_buffer", { audioData });
    console.log("[invokeTranscriptionFromBuffer] Command invoked successfully");
  } catch (error) {
    console.error("Failed to invoke transcription from buffer:", error);
    toast.error("Failed to start transcription", {
      description:
        error instanceof Error ? error.message : "Could not start process.",
    });
  }
}
