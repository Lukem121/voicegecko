import { log } from '@acme/observability';
import { exit } from '@tauri-apps/plugin-process';

import { storeRegistry } from '~/stores/store-registry';

export enum AppState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  SHUTTING_DOWN = 'shutting_down',
  ERROR = 'error',
}

class AppLifecycleManager {
  private static instance: AppLifecycleManager;
  private state: AppState = AppState.INITIALIZING;
  private listeners = new Set<(state: AppState) => void>();

  private constructor() {}

  static getInstance(): AppLifecycleManager {
    AppLifecycleManager.instance ??= new AppLifecycleManager();
    return AppLifecycleManager.instance;
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: AppState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  async startup(): Promise<void> {
    try {
      this.setState(AppState.INITIALIZING);

      // Initialize all stores
      await storeRegistry.initializeAll();

      // Any other startup tasks can go here

      this.setState(AppState.READY);
    } catch (error) {
      log.error('[AppLifecycle] Startup failed:', error);
      this.setState(AppState.ERROR);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.setState(AppState.SHUTTING_DOWN);

      // Cleanup tasks
      // - Save any pending data
      // - Unregister global shortcuts
      // - Close database connections
      // - etc.

      await exit(0);
    } catch (error) {
      log.error('[AppLifecycle] Shutdown error:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.shutdown();
    // Tauri will handle the actual restart
  }
}

export const appLifecycle = AppLifecycleManager.getInstance();
