import { useEffect, useState } from "react";

import type { ShortcutCategory } from "~/lib/shortcuts/types";
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
      const loadedCategories =
        (await shortcutManager
          .getStore()
          .get<ShortcutCategory[]>("shortcuts")) ?? [];
      if (loadedCategories.length > 0) {
        setShortcuts(loadedCategories);
      }
      setIsLoading(false);
    }
    void loadShortcuts();
  }, [setShortcuts]);

  const updateShortcut = async (actionId: string, keys: string[]) => {
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

  const startRecording = async (actionId: string) => {
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
