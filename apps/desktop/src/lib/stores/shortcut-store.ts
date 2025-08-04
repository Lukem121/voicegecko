import { create } from 'zustand';
import { DEFAULT_SHORTCUTS } from '~/lib/shortcuts/constants';
import type { ShortcutCategory, ShortcutId } from '~/lib/shortcuts/types';

interface ShortcutStoreState {
  categories: ShortcutCategory[];
  isRecording: boolean;
  recordingActionId: ShortcutId | null;
  setShortcuts: (categories: ShortcutCategory[]) => void;
  updateShortcut: (actionId: ShortcutId, keys: string[]) => void;
  resetShortcuts: () => void;
  startRecording: (actionId: ShortcutId) => void;
  stopRecording: () => void;
}

export const useShortcutStore = create<ShortcutStoreState>((set, get) => ({
  categories: [], // Start with empty array to avoid race conditions
  isRecording: false,
  recordingActionId: null,

  setShortcuts: (categories) => set({ categories }),

  updateShortcut: (actionId, keys) => {
    const { categories } = get();
    const newCategories = categories.map((category) => ({
      ...category,
      shortcuts: category.shortcuts.map((shortcut) => {
        // Clear shortcut if another action has these keys
        if (
          shortcut.keys.join('+') === keys.join('+') &&
          shortcut.id !== actionId
        ) {
          return { ...shortcut, keys: [] };
        }
        // Update the target shortcut
        if (shortcut.id === actionId) {
          return { ...shortcut, keys };
        }
        return shortcut;
      }),
    }));
    set({ categories: newCategories });
  },

  resetShortcuts: () => set({ categories: DEFAULT_SHORTCUTS }),

  startRecording: (actionId) =>
    set({ isRecording: true, recordingActionId: actionId }),

  stopRecording: () => set({ isRecording: false, recordingActionId: null }),
}));
