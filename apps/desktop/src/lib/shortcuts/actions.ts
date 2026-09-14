import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import type { ShortcutAction } from '~/lib/shortcuts/types';
import { modeForShortcutId } from '~/stores/dictation.store';
import { dictationService } from '~/services/dictation.service';
import { recordingService } from '~/services/recording.service';
import { useEventStore } from '~/stores/event.store';

function recordingForShortcut(shortcutId: string) {
  return recordingService.toggleRecording({
    isKeyboardShortcut: true,
    mode: modeForShortcutId(shortcutId),
  });
}

export const shortcutActions: Record<
  ShortcutAction,
  () => void | Promise<void>
> = {
  'toggle-recording': () => recordingForShortcut('toggle-recording'),

  'paste-last-dictation': () => dictationService.pasteLastDictation(),

  'open-last-dictation': () => dictationService.openLastDictation(),

  'undo-dictation': async () => {
    try {
      await invoke('undo_last_dictation');
      toast.success('Undid last dictation');
    } catch {
      toast.info('Nothing to undo');
    }
  },

  'open-engine-lab': () => {
    emit('navigate', '/settings/engine-lab').catch(() => {
      toast.info('Open Settings → Speed & accuracy');
    });
  },

  'cancel-recording': () => {
    const { recordingStatus } = useEventStore.getState();
    if (recordingStatus !== 'recording' && recordingStatus !== 'processing') {
      return;
    }
    void recordingService.cancelRecording();
  },
};
