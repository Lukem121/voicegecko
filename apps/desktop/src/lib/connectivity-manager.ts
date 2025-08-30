/**
 * Global Connectivity Manager
 *
 * This singleton manages connectivity checking across the entire app.
 * Key features:
 * - Only runs when there's an actual connectivity issue
 * - Single source of truth for connectivity state
 * - Automatic cleanup when issues resolve
 * - No continuous background polling
 */

import { log } from '@acme/observability/log';
import { analytics } from './analytics/posthog-analytics';

export type ConnectivityState = {
  isOnline: boolean;
  isApiReachable: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
  diagnosis: 'healthy' | 'no_internet' | 'api_down' | 'unknown';
  lastSuccessfulCheck: Date | null;
};

type ConnectivityListener = (state: ConnectivityState) => void;

class ConnectivityManager {
  private state: ConnectivityState = {
    isOnline: navigator.onLine,
    isApiReachable: false,
    isChecking: false,
    lastChecked: null,
    error: null,
    diagnosis: 'unknown',
    lastSuccessfulCheck: null,
  };

  private readonly listeners = new Set<ConnectivityListener>();
  private retryInterval: NodeJS.Timeout | null = null;
  private isActive = false;

  /**
   * Subscribe to connectivity state changes
   */
  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
      // If no more listeners, deactivate
      if (this.listeners.size === 0) {
        this.deactivate();
      }
    };
  }

  /**
   * Activate connectivity monitoring (force immediate check)
   */
  activate(): void {
    if (this.isActive) {
      return;
    }

    log.info('🔄 [ConnectivityManager] Activating connectivity monitoring');
    this.isActive = true;

    // Force immediate check to get initial status
    log.info(
      '🚀 [ConnectivityManager] Running immediate connectivity check...'
    );
    this.checkConnectivity();

    // Set up retry interval (30 seconds)
    this.retryInterval = setInterval(() => {
      this.checkConnectivity();
    }, 30_000);

    // Browser events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Deactivate connectivity monitoring (when issue is resolved)
   */
  private deactivate(): void {
    if (!this.isActive) {
      return;
    }

    log.info('✅ [ConnectivityManager] Deactivating connectivity monitoring');
    this.isActive = false;

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Manual connectivity check (can be called by UI)
   */
  async checkConnectivity(): Promise<void> {
    if (this.state.isChecking) {
      log.info('⏸️ [ConnectivityManager] Check already in progress');
      return;
    }

    log.info('🔍 [ConnectivityManager] Starting connectivity check');

    this.updateState({ isChecking: true, error: null });

    try {
      const result = await this.runConnectivityCheck();
      this.updateState(result);

      // If we're healthy, deactivate monitoring
      if (result.diagnosis === 'healthy') {
        this.deactivate();
      } else {
        // Track connectivity issues
        analytics.track('error_occurred', {
          error_type: 'connectivity_issue',
          error_message: `Connectivity diagnosis: ${result.diagnosis}`,
          component: 'ConnectivityManager',
          user_action: 'connectivity_check',
        });
      }
    } catch (error) {
      log.error(error, '💥 [ConnectivityManager] Check failed:');

      // Track connectivity check failure
      analytics.track('error_occurred', {
        error_type: 'connectivity_check_failed',
        error_message: error instanceof Error ? error.message : 'Check failed',
        component: 'ConnectivityManager',
        user_action: 'connectivity_check',
      });

      this.updateState({
        ...this.state,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Check failed',
        diagnosis: 'unknown',
        lastChecked: new Date(),
      });
    }
  }

  /**
   * Get current state (synchronous)
   */
  getState(): ConnectivityState {
    return { ...this.state };
  }

  /**
   * Check if we have connectivity issues
   */
  hasIssues(): boolean {
    return this.state.diagnosis !== 'healthy';
  }

  private async runConnectivityCheck(): Promise<ConnectivityState> {
    let isOnline = false;
    let isApiReachable = false;

    // Step 1: Quick internet check (3 seconds max)
    try {
      log.info('🌐 [ConnectivityManager] Testing internet...');
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);

      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache',
      });

      isOnline = true;
      log.info('✅ [ConnectivityManager] Internet: ONLINE');
    } catch (error) {
      isOnline = false;
      log.info(error, '❌ [ConnectivityManager] Internet: OFFLINE');
    }

    // Step 2: API check (only if internet works)
    if (isOnline) {
      try {
        log.info('🔗 [ConnectivityManager] Testing VoiceGecko API...');
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${import.meta.env.VITE_PUBLIC_VOICEGECKO_URL}/api/health`,
          {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-cache',
            credentials: 'omit',
          }
        );

        isApiReachable = response.ok || response.status === 405;
        log.info(
          `✅ [ConnectivityManager] API: ${isApiReachable ? 'REACHABLE' : 'UNREACHABLE'} (${response.status})`
        );
      } catch (error) {
        isApiReachable = false;
        log.info(error, '❌ [ConnectivityManager] API: FAILED');
      }
    } else {
      log.info('⏭️ [ConnectivityManager] Skipping API check (no internet)');
    }

    // Determine diagnosis
    let diagnosis: ConnectivityState['diagnosis'];
    if (isOnline && isApiReachable) {
      diagnosis = 'healthy';
    } else if (isOnline) {
      diagnosis = 'api_down';
    } else {
      diagnosis = 'no_internet';
    }

    const now = new Date();
    log.info(`🎯 [ConnectivityManager] Check complete: ${diagnosis}`);

    return {
      isOnline,
      isApiReachable,
      isChecking: false,
      lastChecked: now,
      error: null,
      diagnosis,
      lastSuccessfulCheck:
        diagnosis === 'healthy' ? now : this.state.lastSuccessfulCheck,
    };
  }

  private updateState(newState: Partial<ConnectivityState>): void {
    this.state = { ...this.state, ...newState };
    // Notify all listeners
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private readonly handleOnline = (): void => {
    log.info('🟢 [ConnectivityManager] Browser online event');
    this.checkConnectivity();
  };

  private readonly handleOffline = (): void => {
    log.info('🔴 [ConnectivityManager] Browser offline event');
    this.updateState({
      isOnline: false,
      isApiReachable: false,
      diagnosis: 'no_internet',
      isChecking: false,
      lastChecked: new Date(),
    });
  };

  /**
   * Get diagnosis message for UI display
   */
  getDiagnosisMessage(): string {
    switch (this.state.diagnosis) {
      case 'healthy':
        return 'All systems operational';
      case 'no_internet':
        return 'No internet connection detected';
      case 'api_down':
        return 'VoiceGecko servers are unreachable (your internet is working)';
      default:
        return 'Connectivity issue detected';
    }
  }
}

// Global singleton instance
export const connectivityManager = new ConnectivityManager();
