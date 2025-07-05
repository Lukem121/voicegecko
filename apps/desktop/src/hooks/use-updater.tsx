import type { Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export interface UpdaterState {
  isChecking: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
  updateAvailable: boolean;
  update: Update | null;
  error: string | null;
  downloadProgress: number;
}

export interface UpdaterActions {
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

export function useUpdater(): UpdaterState & UpdaterActions {
  const [state, setState] = useState<UpdaterState>({
    isChecking: false,
    isDownloading: false,
    isInstalling: false,
    updateAvailable: false,
    update: null,
    error: null,
    downloadProgress: 0,
  });

  const checkForUpdates = useCallback(async () => {
    setState((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      const update = await check();

      if (update) {
        setState((prev) => ({
          ...prev,
          updateAvailable: true,
          update,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check for updates",
      }));
    } finally {
      setState((prev) => ({ ...prev, isChecking: false }));
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!state.update) return;

    setState((prev) => ({
      ...prev,
      isDownloading: true,
      error: null,
      downloadProgress: 0,
    }));

    try {
      let contentLength = 0;
      let downloaded = 0;

      await state.update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            setState((prev) => ({ ...prev, downloadProgress: 0 }));
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setState((prev) => ({
                ...prev,
                downloadProgress: Math.round(
                  (downloaded / contentLength) * 100,
                ),
              }));
            }
            break;
          case "Finished":
            setState((prev) => ({
              ...prev,
              downloadProgress: 100,
              isDownloading: false,
              isInstalling: true,
            }));
            break;
        }
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to download update",
        isDownloading: false,
      }));
    }
  }, [state.update]);

  const installUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, isInstalling: true, error: null }));

    try {
      await relaunch();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to restart application",
        isInstalling: false,
      }));
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      updateAvailable: false,
      update: null,
      error: null,
    }));
  }, []);

  // Check for updates on mount
  useEffect(() => {
    void checkForUpdates();
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  };
}
