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
  isCritical: boolean; // Whether the current update is critical/forced
  userAcknowledged: boolean; // Whether user has acknowledged critical update
}

export interface UpdaterActions {
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  acknowledgeCriticalUpdate: () => void;
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
    isCritical: false,
    userAcknowledged: false,
  });

  const checkForUpdates = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isChecking: true,
      error: null,
      userAcknowledged: false,
    }));

    console.log("checking for updates");

    try {
      const update = await check();

      console.log("update", update);

      if (update) {
        console.log("rawJson", update.rawJson);
        const isCritical = update.rawJson.critical === true;

        console.log("Update found:", {
          version: update.version,
          critical: isCritical,
          rawJsonCritical: update.rawJson.critical,
        });

        setState((prev) => ({
          ...prev,
          updateAvailable: true,
          update,
          isCritical,
        }));
      }
    } catch (error) {
      console.log("use-updater error", error);

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
    setState((prev) => {
      // Prevent dismissing critical updates
      if (prev.isCritical) {
        console.warn("Cannot dismiss critical update");
        return prev;
      }

      return {
        ...prev,
        updateAvailable: false,
        update: null,
        error: null,
        isCritical: false,
        userAcknowledged: false,
      };
    });
  }, []);

  const acknowledgeCriticalUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      userAcknowledged: true,
    }));
  }, []);

  // Check for updates on mount
  useEffect(() => {
    void checkForUpdates();
  }, [checkForUpdates]);

  // Auto-start download for critical updates after user acknowledgment
  useEffect(() => {
    if (
      state.isCritical &&
      state.updateAvailable &&
      state.userAcknowledged &&
      !state.isDownloading &&
      !state.isInstalling
    ) {
      console.log(
        "Critical update acknowledged - starting download automatically",
      );
      void downloadUpdate();
    }
  }, [
    state.isCritical,
    state.updateAvailable,
    state.userAcknowledged,
    state.isDownloading,
    state.isInstalling,
    downloadUpdate,
  ]);

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    acknowledgeCriticalUpdate,
  };
}
