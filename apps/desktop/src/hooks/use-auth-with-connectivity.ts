import { useEffect, useRef } from "react";

import { useSession } from "./auth";
import { useAuth } from "./use-auth";
import { useAuthConnectivityHandler } from "./use-connectivity";

/**
 * Enhanced auth hook with smart connectivity integration
 *
 * This combines pure auth with connectivity error detection:
 * - Uses clean auth hook for authentication
 * - Only activates connectivity checking when auth fails
 * - Provides unified interface for components
 */
export function useAuthWithConnectivity() {
  const auth = useAuth();
  const { isConnectivityError, connectivity } = useAuthConnectivityHandler(
    auth.error,
  );
  const { query } = useSession();
  const previousDiagnosisRef = useRef(connectivity.diagnosis);

  // Refresh session when connectivity is restored
  useEffect(() => {
    const previousDiagnosis = previousDiagnosisRef.current;
    const currentDiagnosis = connectivity.diagnosis;

    // If we went from having connectivity issues to being healthy, refresh the session
    if (
      previousDiagnosis !== "healthy" &&
      currentDiagnosis === "healthy" &&
      previousDiagnosis !== "unknown" // Don't refresh on initial load
    ) {
      console.log("🔄 [Auth] Connectivity restored, refreshing session...");
      void query.refetch();
    }

    previousDiagnosisRef.current = currentDiagnosis;
  }, [connectivity.diagnosis, query]);

  const getAuthIssueType = () => {
    if (auth.isLoading) return "loading";
    if (isConnectivityError) return "connectivity";
    if (auth.error) return "auth";
    if (!auth.user) return "unauthenticated";
    return "authenticated";
  };

  return {
    // Pure auth state
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    error: auth.error,

    // Connectivity integration
    isConnectivityError,
    connectivity: {
      isOnline: connectivity.isOnline,
      isApiReachable: connectivity.isApiReachable,
      isChecking: connectivity.isChecking,
      hasConnectivityIssue: connectivity.hasConnectivityIssue,
      checkConnectivity: connectivity.checkConnectivity,
      diagnosis: connectivity.diagnosis,
      getDiagnosisMessage: connectivity.getDiagnosisMessage,
      lastSuccessfulCheck: connectivity.lastSuccessfulCheck,
      isVoiceGeckoIssue: connectivity.isVoiceGeckoIssue,
      isInternetIssue: connectivity.isInternetIssue,
    },

    // Unified interface
    getAuthIssueType,
  };
}
