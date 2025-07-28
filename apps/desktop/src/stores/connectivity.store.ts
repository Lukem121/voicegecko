import { create } from "zustand";

import type { ConnectivityState } from "~/lib/connectivity-manager";
import { connectivityManager } from "~/lib/connectivity-manager";

interface ConnectivityStore extends ConnectivityState {
  // Actions
  activateMonitoring: () => void;
  checkConnectivity: () => Promise<void>;

  // Computed values
  hasConnectivityIssue: boolean;
  isApiUnavailable: boolean;
  canSaveTranscriptions: boolean;
}

/**
 * Zustand store that wraps the ConnectivityManager singleton
 * Provides reactive state management for connectivity monitoring
 */
export const useConnectivityStore = create<ConnectivityStore>((set, get) => {
  // Initialize with current connectivity manager state
  const initialState = connectivityManager.getState();

  // Subscribe to connectivity manager updates
  const unsubscribe = connectivityManager.subscribe((newState) => {
    set({
      ...newState,
      hasConnectivityIssue: newState.diagnosis !== "healthy",
      isApiUnavailable: newState.diagnosis === "api_down",
      // Only allow transcriptions when we know API is healthy
      canSaveTranscriptions: newState.diagnosis === "healthy",
    });
  });

  // Store the unsubscribe function for cleanup if needed
  (globalThis as any).__connectivityStoreCleanup = unsubscribe;

  return {
    // Initial state from connectivity manager
    ...initialState,

    // Computed values
    hasConnectivityIssue: initialState.diagnosis !== "healthy",
    isApiUnavailable: initialState.diagnosis === "api_down",
    // Only allow transcriptions when we know API is healthy
    canSaveTranscriptions: initialState.diagnosis === "healthy",

    // Actions
    activateMonitoring: () => {
      connectivityManager.activate();
    },

    checkConnectivity: async () => {
      await connectivityManager.checkConnectivity();
    },
  };
});
