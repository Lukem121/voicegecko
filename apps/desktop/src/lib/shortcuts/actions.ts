import type { ShortcutAction } from '~/lib/shortcuts/types';
import { dictationService } from '~/services/dictation.service';
import { recordingService } from '~/services/recording.service';

// Simple action handlers for keyboard shortcuts
export const shortcutActions: Record<
  ShortcutAction,
  () => void | Promise<void>
> = {
  'toggle-recording': () =>
    recordingService.toggleRecording({ isKeyboardShortcut: true }),

  'paste-last-dictation': () => dictationService.pasteLastDictation(),

  'open-last-dictation': () => dictationService.openLastDictation(),
};
