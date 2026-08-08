/** biome-ignore-all lint/style/useReadonlyClassProperties: it is? */
import { log } from '@acme/observability/log';
import { emit } from '@tauri-apps/api/event';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

import { dictionaryService } from '~/services/dictionary.service';
import { storeRegistry } from '~/stores/store-registry';
import { useUpdateStore } from '~/stores/update.store';
import { setInitializationFlag } from '~/trpc';
import { analytics } from './analytics/posthog-analytics';
import { isLocalOnlyMode } from './local-mode';
import { initializeModelBootstrapListeners } from './model-bootstrap';
import { initializeTauriEvents } from './tauri-events';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'installing'
  | 'ready-to-relaunch'
  | 'no-update'
  | 'error';

export type UpdateProgressCallback = (progress: number) => void;
export type UpdateStatusCallback = (status: string) => void;

/**
 * Global app lifecycle manager
 * Handles app-wide concerns that should happen once, not per React component
 */
class AppLifecycleManager {
  private static instance: AppLifecycleManager;
  private hasCheckedForUpdates = false;
  private isInitialized = false;
  private updateStatus: UpdateStatus = 'idle';
  private updateProgress = 0;
  private readonly statusCallbacks: Set<UpdateStatusCallback> = new Set();
  private readonly progressCallbacks: Set<UpdateProgressCallback> = new Set();
  private updatePromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): AppLifecycleManager {
    if (!AppLifecycleManager.instance) {
      AppLifecycleManager.instance = new AppLifecycleManager();
    }
    return AppLifecycleManager.instance;
  }

  /**
   * Subscribe to update status changes (for UI components)
   */
  onUpdateStatus(callback: UpdateStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately notify with current status
    callback(this.getStatusMessage());

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to update progress changes (for UI components)
   */
  onUpdateProgress(callback: UpdateProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    // Immediately notify with current progress
    callback(this.updateProgress);

    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Get current update status
   */
  getUpdateStatus(): UpdateStatus {
    return this.updateStatus;
  }

  /**
   * Get current update progress (0-100)
   */
  getUpdateProgress(): number {
    return this.updateProgress;
  }

  /**
   * Check if an update operation is currently in progress
   */
  isUpdating(): boolean {
    return (
      this.updateStatus !== 'idle' &&
      this.updateStatus !== 'no-update' &&
      this.updateStatus !== 'error'
    );
  }

  /**
   * Get user-friendly status message
   */
  private getStatusMessage(): string {
    switch (this.updateStatus) {
      case 'checking':
        return 'Checking for updates...';
      case 'downloading':
        return `Downloading update... ${this.updateProgress}%`;
      case 'installing':
        return 'Installing update...';
      case 'ready-to-relaunch':
        return 'Update ready, relaunching...';
      case 'error':
        return 'Update failed';
      case 'no-update':
        return 'No updates available';
      default:
        return '';
    }
  }

  /**
   * Notify all status subscribers
   */
  private notifyStatusChange(status: UpdateStatus): void {
    this.updateStatus = status;
    const message = this.getStatusMessage();
    for (const callback of this.statusCallbacks) {
      callback(message);
    }
  }

  /**
   * Notify all progress subscribers
   */
  private notifyProgressChange(progress: number): void {
    this.updateProgress = progress;
    for (const callback of this.progressCallbacks) {
      callback(progress);
    }
    // Also notify status change to update the progress in status message
    this.notifyStatusChange(this.updateStatus);
  }

  /**
   * Check for updates ONCE when the app starts
   * Multiple calls to this method will return the same promise
   */
  async checkForUpdatesOnce(): Promise<void> {
    // If already checking, return the existing promise
    if (this.updatePromise) {
      log.info(
        '[AppLifecycle] ✅ Update check already in progress, returning existing promise'
      );
      return this.updatePromise;
    }

    // If already checked, return immediately with current status
    if (this.hasCheckedForUpdates) {
      log.info('[AppLifecycle] ✅ Updates already checked');
      return;
    }

    // Create and store the promise for this update check
    this.updatePromise = this.performUpdateCheck();

    try {
      await this.updatePromise;
    } finally {
      // Clear the promise when done (success or failure)
      this.updatePromise = null;
    }
  }

  /**
   * Perform the actual update check - only called once
   */
  private async performUpdateCheck(): Promise<void> {
    this.hasCheckedForUpdates = true;

    try {
      const { isAirGapMode } = await import('./air-gap');
      if (await isAirGapMode()) {
        log.info('[AppLifecycle] Privacy mode on — skipping update check');
        this.notifyStatusChange('no-update');
        return;
      }

      log.info('[AppLifecycle] 🔍 Performing one-time update check...');
      this.notifyStatusChange('checking');

      const update = await check();
      if (!update) {
        log.info('[AppLifecycle] ✅ No updates available');
        this.notifyStatusChange('no-update');
        try {
          useUpdateStore.getState().setAvailable(null);
          useUpdateStore.getState().setLastCheckedNow();
        } catch (e) {
          log.debug('[AppLifecycle] update store not ready', e as unknown);
        }
        return;
      }

      // Do not auto-install on launch. Record availability and continue startup.
      log.info(
        '[AppLifecycle] 🎉 Update available (deferred):',
        update.version
      );

      // Fire analytics but do not block app startup
      try {
        analytics.track('feature_first_use', {
          feature_name: 'update_available',
          time_to_first_use_seconds: 0,
        });
      } catch (e) {
        log.warn('[AppLifecycle] Failed to track update_available:', e);
      }

      // Reset status to idle so UI can proceed
      this.notifyStatusChange('idle');
      this.notifyProgressChange(0);
      try {
        useUpdateStore.getState().setAvailable({ version: update.version });
        useUpdateStore.getState().setLastCheckedNow();
      } catch (e) {
        log.debug('[AppLifecycle] update store not ready', e as unknown);
      }
    } catch (error) {
      // Don't throw - app should continue even if updates fail
      log.error(error, '[AppLifecycle] ❌ Update check failed:');
      this.notifyStatusChange('error');
      log.info('[AppLifecycle] 🚀 Continuing with app startup...');
    }
  }

  /**
   * Schedule periodic update checks while the app is running
   * intervalMs default: 12 hours
   */
  schedulePeriodicChecks(intervalMs = 12 * 60 * 60 * 1000): void {
    const run = async () => {
      try {
        // Re-use the same check logic but do not auto-install
        await this.performUpdateCheck();
      } catch (e) {
        log.warn(e, '[AppLifecycle] Periodic update check failed:');
      }
    };

    // First periodic run happens after interval to avoid duplicate with launch check
    setInterval(run, intervalMs);
  }

  /**
   * Force an update now (used when server requires an upgrade)
   * This will download and install the update and relaunch.
   */
  async forceUpdateNow(): Promise<void> {
    try {
      log.info('[AppLifecycle] 🚨 Forced update initiated');
      this.notifyStatusChange('checking');
      try {
        useUpdateStore.getState().setInstalling(true);
        useUpdateStore.getState().setProgress(0);
      } catch (e) {
        log.debug('[AppLifecycle] update store not ready', e as unknown);
      }

      const update = await check();
      if (!update) {
        log.info('[AppLifecycle] No update available during forced update');
        this.notifyStatusChange('no-update');
        try {
          useUpdateStore.getState().setInstalling(false);
        } catch (e) {
          log.debug('[AppLifecycle] update store not ready', e as unknown);
        }
        return;
      }

      this.notifyStatusChange('downloading');

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        const progress =
          contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0;

        switch (event.event) {
          case 'Started':
            log.info('[AppLifecycle] 📥 Forced update download started');
            contentLength = event.data.contentLength ?? 0;
            this.notifyProgressChange(0);
            try {
              useUpdateStore.getState().setProgress(0);
            } catch (e) {
              log.debug('[AppLifecycle] update store not ready', e as unknown);
            }
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            this.notifyProgressChange(progress);
            if (progress % 25 === 0 || progress === 100) {
              log.info(
                `[AppLifecycle] 📊 Forced update progress: ${progress}%`
              );
            }
            try {
              useUpdateStore.getState().setProgress(progress);
            } catch (e) {
              log.debug('[AppLifecycle] update store not ready', e as unknown);
            }
            break;
          case 'Finished':
            log.info('[AppLifecycle] ✅ Forced update download finished');
            this.notifyStatusChange('installing');
            try {
              useUpdateStore.getState().setProgress(100);
            } catch (e) {
              log.debug('[AppLifecycle] update store not ready', e as unknown);
            }
            break;
          default:
            break;
        }
      });

      log.info('[AppLifecycle] 🔄 Forced update installed, relaunching app...');
      this.notifyStatusChange('ready-to-relaunch');

      try {
        analytics.track('feature_first_use', {
          feature_name: 'update_installed',
          time_to_first_use_seconds: 0,
        });
      } catch (e) {
        log.warn('[AppLifecycle] Failed to track update_installed:', e);
      }

      await relaunch();
    } catch (error) {
      log.error(error, '[AppLifecycle] ❌ Forced update failed:');
      this.notifyStatusChange('error');
      try {
        useUpdateStore.getState().setInstalling(false);
      } catch (e) {
        log.debug('[AppLifecycle] update store not ready', e as unknown);
      }
    }
  }

  /**
   * Initialize core app systems ONCE
   * This runs independently of React but can be called safely multiple times
   */
  async initializeCoreSystemsOnce(): Promise<void> {
    if (this.isInitialized) {
      log.info('[AppLifecycle] ✅ Core systems already initialized, skipping');
      return;
    }

    const startTime = Date.now();
    log.info('[AppLifecycle] 🚀 Initializing core systems...');

    try {
      // Set initialization flag to prevent 401 logout during startup
      setInitializationFlag(true);

      // Initialize stores
      log.info('[AppLifecycle] 🗄️ Initializing stores...');
      await storeRegistry.initializeAll();

      if (await isLocalOnlyMode()) {
        await emit('auth-state-changed', {
          isAuthenticated: true,
          hasUser: false,
        });
        log.info('[AppLifecycle] Local-only mode active — auth gate bypassed');
      }

      // Initialize Tauri event listeners (only for main window)
      log.info('[AppLifecycle] 📡 Initializing event listeners...');
      await initializeTauriEvents({ isGeckoBar: false });
      await initializeModelBootstrapListeners();

      this.isInitialized = true;
      log.info('[AppLifecycle] ✅ Core systems initialized successfully');

      // Track successful app startup
      const startupTime = (Date.now() - startTime) / 1000;
      analytics.track('app_startup', {
        startup_time_seconds: startupTime,
        initialization_steps: [
          'store_init',
          'event_listeners',
          'model_bootstrap',
        ],
        models_synchronized: false,
        auto_update_available: false,
      });

      // Clear initialization flag - now 401 errors should trigger logout
      setInitializationFlag(false);

      // Post-initialization optimizations (non-blocking)
      this.runPostInitializationTasks().catch((error) => {
        log.warn(error, '[AppLifecycle] Post-initialization tasks failed:');
      });
    } catch (error) {
      log.error(error, '[AppLifecycle] ❌ Failed to initialize core systems:');

      // Clear initialization flag even on failure
      setInitializationFlag(false);

      // Track initialization failure
      analytics.track('error_occurred', {
        error_type: 'app_initialization',
        error_message:
          error instanceof Error
            ? error.message
            : 'Unknown initialization error',
        component: 'AppLifecycleManager',
        user_action: 'app_startup',
      });

      throw error;
    }
  }

  /**
   * Run non-critical post-initialization tasks
   */
  private async runPostInitializationTasks(): Promise<void> {
    // Prefetch dictionary prompt for faster dictations
    try {
      await dictionaryService.prefetchDictionaryPrompt();
      log.info('[AppLifecycle] Dictionary prompt prefetched successfully');
    } catch (error) {
      log.warn(error, '[AppLifecycle] Failed to prefetch dictionary prompt:');
    }

  }
}

// Export singleton instance
export const appLifecycle = AppLifecycleManager.getInstance();
