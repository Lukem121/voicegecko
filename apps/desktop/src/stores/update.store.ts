import { log } from '@acme/observability/log';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';
import { create } from 'zustand';

type UpdateInfo = {
  version: string;
  notes?: string;
};

type UpdateState = {
  availableUpdate: UpdateInfo | null;
  isChecking: boolean;
  isInstalling: boolean;
  progress: number; // 0-100
  lastCheckedAt?: number;
  error?: string | null;

  // Actions
  setAvailable: (info: UpdateInfo | null) => void;
  setInstalling: (installing: boolean) => void;
  setProgress: (value: number) => void;
  setLastCheckedNow: () => void;
  setError: (message: string | null) => void;

  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
};

export const useUpdateStore = create<UpdateState>((set, get) => ({
  availableUpdate: null,
  isChecking: false,
  isInstalling: false,
  progress: 0,
  lastCheckedAt: undefined,
  error: null,

  setAvailable: (info) => {
    const previous = get().availableUpdate;
    set({ availableUpdate: info });
    if (!previous && info) {
      // Show a non-intrusive toast when an update first becomes available
      toast.info(`Update available (v${info.version})`, {
        action: {
          label: 'Install now',
          onClick: () => {
            // Kick off install, errors are handled internally
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            get().installUpdate();
          },
        },
        description: 'You can also install from Settings > Updates.',
      });
    }
  },

  setInstalling: (installing) => set({ isInstalling: installing }),
  setProgress: (value) => set({ progress: Math.max(0, Math.min(100, value)) }),
  setLastCheckedNow: () => set({ lastCheckedAt: Date.now() }),
  setError: (message) => set({ error: message ?? null }),

  checkForUpdates: async () => {
    if (get().isChecking) {
      return;
    }
    set({ isChecking: true, error: null });
    try {
      const { isAirGapMode } = await import('~/lib/air-gap');
      if (await isAirGapMode()) {
        toast.info('Privacy mode is on — update checks are disabled.');
        get().setAvailable(null);
        get().setLastCheckedNow();
        return;
      }

      const update = await check();
      if (update) {
        log.info('[UpdateStore] Update available', { version: update.version });
        get().setAvailable({ version: update.version });
      } else {
        log.info('[UpdateStore] No updates available');
        get().setAvailable(null);
      }
      get().setLastCheckedNow();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.warn('[UpdateStore] Check for updates failed', { message });
      get().setError('Failed to check for updates');
      toast.error('Failed to check for updates');
    } finally {
      set({ isChecking: false });
    }
  },

  installUpdate: async () => {
    if (get().isInstalling) {
      return;
    }
    set({ isInstalling: true, progress: 0, error: null });
    try {
      const update = await check();
      if (!update) {
        toast.info('You are already on the latest version.');
        set({ isInstalling: false });
        return;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        const progress =
          contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0;
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            set({ progress: 0 });
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            set({ progress });
            break;
          case 'Finished':
            set({ progress: 100 });
            break;
          default:
            break;
        }
      });

      // Successful install; relaunch the app
      await relaunch();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.error(message, '[UpdateStore] Install failed');
      toast.error('Install failed. Please try again.');
      set({ isInstalling: false });
    }
  },
}));
