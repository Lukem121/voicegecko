import { useEffect, useState } from "react";

import type { ShortcutCategory, ShortcutId } from "~/lib/shortcuts/types";
import { DEFAULT_SHORTCUTS } from "~/lib/shortcuts/constants";
import { shortcutManager } from "~/lib/shortcuts/manager";
import { useShortcutStore } from "~/lib/stores/shortcut-store";

export function useShortcuts() {
  const {
    categories,
    isRecording,
    recordingActionId,
    setShortcuts,
    updateShortcut: updateShortcutInStore,
    resetShortcuts: resetShortcutsInStore,
    startRecording: startRecordingInStore,
    stopRecording: stopRecordingInStore,
  } = useShortcutStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadShortcuts() {
      setIsLoading(true);
      try {
        const loadedCategories =
          (await shortcutManager
            .getStore()
            .get<ShortcutCategory[]>("shortcuts")) ?? DEFAULT_SHORTCUTS;
        setShortcuts(loadedCategories);
      } catch (error) {
        console.error("Failed to load shortcuts:", error);
        // Fall back to defaults if loading fails
        setShortcuts(DEFAULT_SHORTCUTS);
      } finally {
        setIsLoading(false);
      }
    }
    void loadShortcuts();
  }, [setShortcuts]);

  const updateShortcut = async (actionId: ShortcutId, keys: string[]) => {
    updateShortcutInStore(actionId, keys);
    await shortcutManager.updateAndSaveShortcuts(
      useShortcutStore.getState().categories,
    );
  };

  const resetShortcuts = async () => {
    resetShortcutsInStore();
    await shortcutManager.updateAndSaveShortcuts(
      useShortcutStore.getState().categories,
    );
  };

  const startRecording = async (actionId: ShortcutId) => {
    await shortcutManager.unregisterAll();
    startRecordingInStore(actionId);
  };

  const cancelRecording = async () => {
    stopRecordingInStore();
    await shortcutManager.registerAllShortcuts(
      useShortcutStore.getState().categories,
    );
  };

  return {
    shortcutCategories: categories,
    isRecording,
    recordingActionId,
    isLoading,
    startRecording,
    stopRecording: stopRecordingInStore,
    cancelRecording,
    updateShortcut,
    resetShortcuts,
  };
}
