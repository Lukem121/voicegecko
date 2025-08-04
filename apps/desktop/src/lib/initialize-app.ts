// This function is used to initialize the app

import { log } from '@acme/observability';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

import { dictionaryService } from '~/services/dictionary.service';
import { storeRegistry } from '~/stores/store-registry';
import { analytics } from './analytics/posthog-analytics';
import { initializeTauriEvents } from './tauri-events';

interface InitializeOptions {
  onUpdateStatus?: (status: string) => void;
  onUpdateProgress?: (progress: number) => void;
  onUpdateDownloaded?: () => void;
}

/**
 * Check for and install app updates
 */
async function checkAndInstallUpdates(options?: InitializeOptions) {
  log.info('[Updater] Checking for updates...');
  options?.onUpdateStatus?.('Checking for updates...');

  try {
    const update = await check();
    if (!update) {
      log.info('[Updater] No updates available');
      return;
    }

    log.info('[Updater] Update available:', update.version);
    options?.onUpdateStatus?.(`Downloading update ${update.version}...`);

    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      const progress =
        contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;

      switch (event.event) {
        case 'Started':
          log.info('[Updater] Download started');
          contentLength = event.data.contentLength ?? 0;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          log.info(`[Updater] Download progress: ${progress}%`);
          options?.onUpdateProgress?.(progress);
          options?.onUpdateStatus?.(`Downloading update... ${progress}%`);
          break;
        case 'Finished':
          log.info('[Updater] Download finished');
          options?.onUpdateStatus?.('Installing update...');
          options?.onUpdateDownloaded?.();
          break;
      }
    });

    log.info('[Updater] Update installed, relaunching...');
    await relaunch();
  } catch (error) {
    // Don't throw on update errors - the app should still work
    log.error('[Updater] Failed to check/install updates:', error);
  }
}

/**
 * Initialize the application
 * This should be called once when the main window loads
 */
export async function initializeApp(
  options?: InitializeOptions
): Promise<void> {
  const startTime = Date.now();
  log.info('[App] 🚀 Initializing application...');

  const initializationSteps: string[] = [];

  try {
    // Check for updates first during launch
    initializationSteps.push('update_check');
    await checkAndInstallUpdates(options);

    // Synchronize models to detect bundled models
    initializationSteps.push('model_sync');
    options?.onUpdateStatus?.('Initializing models...');
    await invoke('synchronize_models'); // Synchronize models first

    // Check and clean up any partial downloads from previous sessions
    initializationSteps.push('cleanup_check');
    try {
      const partialFiles = await invoke<string[]>(
        'check_and_fix_partial_downloads'
      );
      if (partialFiles.length > 0) {
        log.info('[App] Cleaned up partial downloads:', partialFiles);
      }
    } catch (error) {
      log.warn('[App] Failed to check partial downloads:', error);
    }

    initializationSteps.push('store_init');
    options?.onUpdateStatus?.('Initializing application...');
    await storeRegistry.initializeAll();

    // Initialize Tauri event listeners
    initializationSteps.push('event_listeners');
    await initializeTauriEvents();

    // Prefetch dictionary prompt for faster transcriptions
    initializationSteps.push('dictionary_prefetch');
    dictionaryService.prefetchDictionaryPrompt().catch((error) => {
      log.warn('[App] Failed to prefetch dictionary prompt:', error);
    });

    // Trigger automatic download of recommended model (non-blocking)
    // Add a small delay to ensure model synchronization is complete
    setTimeout(() => {
      const downloadId = `${Date.now()}-${Math.random()}`;
      log.info(`[App] Starting auto-download check (ID: ${downloadId})`);

      invoke('auto_download_recommended_model')
        .then(() => {
          log.info(`[App] Auto-download check completed (ID: ${downloadId})`);
        })
        .catch((error) => {
          log.error(
            `[App] Failed to auto-download recommended model (ID: ${downloadId}):`,
            error
          );
        });
    }, 1000);

    log.info('[App] ✅ Application initialized successfully');
    options?.onUpdateStatus?.('Application ready');

    // Track successful app startup
    const startupTime = (Date.now() - startTime) / 1000;
    analytics.track('app_startup', {
      startup_time_seconds: startupTime,
      initialization_steps: initializationSteps,
      models_synchronized: true,
      auto_update_available: false, // Could be enhanced to detect this
    });
  } catch (error) {
    log.error('[App] ❌ Failed to initialize application:', error);
    options?.onUpdateStatus?.('Initialization failed');

    // Track initialization failure
    const _failedTime = (Date.now() - startTime) / 1000;
    analytics.track('error_occurred', {
      error_type: 'app_initialization',
      error_message:
        error instanceof Error ? error.message : 'Unknown initialization error',
      component: 'initializeApp',
      user_action: 'app_startup',
    });

    throw error;
  }
}
