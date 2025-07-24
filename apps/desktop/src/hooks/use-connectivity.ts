import { useEffect, useState } from "react";

import type { ConnectivityState } from "~/lib/connectivity-manager";
import { connectivityManager } from "~/lib/connectivity-manager";
import { isNetworkError } from "./auth";

/**
 * Hook to access global connectivity state
 *
 * This hook subscribes to the global connectivity manager.
 * The manager only runs when there are actual connectivity issues.
 */
export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>(
    connectivityManager.getState(),
  );

  useEffect(() => {
    // Subscribe to connectivity state changes
    const unsubscribe = connectivityManager.subscribe(setState);

    return unsubscribe;
  }, []);

  return {
    ...state,
    hasConnectivityIssue: state.diagnosis !== "healthy",
    isVoiceGeckoIssue: state.diagnosis === "api_down",
    isInternetIssue: state.diagnosis === "no_internet",
    getDiagnosisMessage: () => connectivityManager.getDiagnosisMessage(),
    checkConnectivity: () => connectivityManager.checkConnectivity(),
  };
}

/**
 * Hook for detecting connectivity issues from auth errors
 *
 * This is the smart integration point that activates connectivity monitoring
 * only when there's an actual auth error that might be connectivity-related.
 */
export function useAuthConnectivityHandler(authError: unknown) {
  const connectivity = useConnectivity();

  useEffect(() => {
    if (authError && isNetworkError(authError)) {
      console.log(
        "🔍 [AuthConnectivity] Auth error detected, checking connectivity...",
      );
      // Activate connectivity monitoring
      connectivityManager.activate();
    }
  }, [authError]);

  // Only consider it a connectivity error if we have both:
  // 1. An auth error AND 2. Actual connectivity issues
  const isConnectivityError = authError && connectivity.hasConnectivityIssue;

  return {
    isConnectivityError: !!isConnectivityError,
    connectivity,
  };
}
