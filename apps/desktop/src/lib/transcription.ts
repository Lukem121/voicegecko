import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import type { AudioData } from "~/types/events";
import { transcriptionService } from "~/services/transcription.service";

/**
 * Invokes the transcription process on the backend using audio buffer data.
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

/**
 * Handles the completed transcription using the transcription service.
 * This function is called from the transcription hook.
 *
 * @param transcript - The transcribed text.
 */
export async function handleCompletedTranscription(transcript: string) {
  await transcriptionService.handleCompletedTranscription(transcript);
}
