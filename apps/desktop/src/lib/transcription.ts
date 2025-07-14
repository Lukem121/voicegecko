import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

import { setLastTranscription } from "~/lib/shortcuts/actions";

/**
 * Handles the entire transcription process for a given audio file.
 *
 * @param audioPath - The path to the audio file to be transcribed.
 * @returns The transcribed text, or null if transcription fails.
 */
export async function transcribeAndProcess(
  audioPath: string,
): Promise<string | null> {
  try {
    const modelId = await invoke<string | null>("get_active_model_id");

    if (!modelId || modelId === "cloud") {
      toast.info("Cloud transcription is not yet supported.", {
        description: "Please select a local model in settings.",
      });
      return null;
    }

    const transcript = await invoke<string>("transcribe_audio", { audioPath });

    console.log("Transcript:", transcript);

    if (transcript) {
      await writeText(transcript);
      // Ensure the "paste last transcription" shortcut has the latest content
      setLastTranscription(transcript);
      toast.success("Transcription complete and copied to clipboard!");
    } else {
      toast.warning("Transcription returned an empty result.");
    }

    return transcript;
  } catch (error) {
    console.error("Failed to transcribe audio:", error);
    toast.error("Transcription failed", {
      description:
        error instanceof Error ? error.message : "Could not process audio.",
    });
    return null;
  }
}
