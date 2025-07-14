import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

import { setLastTranscription } from "~/lib/shortcuts/actions";

/**
 * Invokes the transcription process on the backend using a file path.
 *
 * @param audioPath - The path to the audio file to be transcribed.
 */
export async function invokeTranscription(audioPath: string) {
  try {
    await invoke("transcribe_audio", { audioPath });
  } catch (error) {
    console.error("Failed to invoke transcription:", error);
    toast.error("Failed to start transcription", {
      description:
        error instanceof Error ? error.message : "Could not start process.",
    });
  }
}

/**
 * Invokes the transcription process on the backend using audio buffer data.
 *
 * @param audioData - The audio data including samples, sample rate, and channels.
 */
export async function invokeTranscriptionFromBuffer(audioData: {
  samples: number[];
  sample_rate: number;
  channels: number;
}) {
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
 * Handles the completed transcription, updating clipboard and state.
 *
 * @param transcript - The transcribed text.
 */
export async function handleCompletedTranscription(transcript: string) {
  console.log(
    "[handleCompletedTranscription] Received transcript:",
    transcript,
  );

  if (transcript) {
    try {
      await writeText(transcript);
      console.log(
        "[handleCompletedTranscription] Successfully copied to clipboard",
      );
      setLastTranscription(transcript);

      toast.success("Transcription complete and copied to clipboard!");
    } catch (error) {
      console.error(
        "[handleCompletedTranscription] Failed to copy to clipboard:",
        error,
      );
      toast.error("Failed to copy to clipboard", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    console.warn("[handleCompletedTranscription] Empty transcript received");
    toast.warning("Transcription returned an empty result.");
  }
}
