import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

import { setLastTranscription } from "~/lib/shortcuts/actions";

/**
 * Invokes the transcription process on the backend.
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
 * Handles the completed transcription, updating clipboard and state.
 *
 * @param transcript - The transcribed text.
 */
export async function handleCompletedTranscription(transcript: string) {
  if (transcript) {
    await writeText(transcript);
    setLastTranscription(transcript);
    toast.success("Transcription complete and copied to clipboard!");
  } else {
    toast.warning("Transcription returned an empty result.");
  }
}
