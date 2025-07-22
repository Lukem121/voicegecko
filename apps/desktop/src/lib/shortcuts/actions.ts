import type { ShortcutAction } from "~/lib/shortcuts/types";
import { recordingService } from "~/services/recording.service";
import { transcriptionService } from "~/services/transcription.service";

// Simple action handlers for keyboard shortcuts
export const shortcutActions: Record<
  ShortcutAction,
  () => void | Promise<void>
> = {
  "toggle-recording": () =>
    recordingService.toggleRecording({ isKeyboardShortcut: true }),

  "paste-last-transcription": () =>
    transcriptionService.pasteLastTranscription(),

  "open-last-transcription": () => transcriptionService.openLastTranscription(),
};
