import { useCallback, useEffect, useState } from "react";

export interface ConnectivityState {
  isOnline: boolean;
  isApiReachable: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
  diagnosis: "healthy" | "no_internet" | "api_down" | "unknown";
  lastSuccessfulCheck: Date | null;
}

interface UseConnectivityOptions {
  checkInterval?: number;
  enabled?: boolean;
}

/**
 * Super simple connectivity checker that always works
 */
async function runConnectivityCheck(): Promise<ConnectivityState> {
  console.log("🔍 [Connectivity] Starting check...");

  let isOnline = false;
  let isApiReachable = false;

  // Step 1: Quick internet check (3 seconds max)
  try {
    console.log("🌐 [Connectivity] Testing internet...");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);

    await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-cache",
    });

    isOnline = true;
    console.log("✅ [Connectivity] Internet: ONLINE");
  } catch (error) {
    isOnline = false;
    console.log("❌ [Connectivity] Internet: OFFLINE", error);
  }

  // Step 2: API check (only if internet works)
  if (isOnline) {
    try {
      console.log("🔗 [Connectivity] Testing VoiceGecko API...");
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_VOICEGECKO_URL}/api/health`,
        {
          method: "GET",
          signal: controller.signal,
          cache: "no-cache",
          credentials: "omit",
        },
      );

      isApiReachable = response.ok || response.status === 405;
      console.log(
        `✅ [Connectivity] API: ${isApiReachable ? "REACHABLE" : "UNREACHABLE"} (${response.status})`,
      );
    } catch (error) {
      isApiReachable = false;
      console.log("❌ [Connectivity] API: FAILED", error);
    }
  } else {
    console.log("⏭️ [Connectivity] Skipping API check (no internet)");
  }

  // Determine diagnosis
  let diagnosis: ConnectivityState["diagnosis"];
  if (isOnline && isApiReachable) {
    diagnosis = "healthy";
  } else if (!isOnline) {
    diagnosis = "no_internet";
  } else {
    diagnosis = "api_down";
  }

  const now = new Date();
  console.log(`🎯 [Connectivity] Check complete: ${diagnosis}`);

  return {
    isOnline,
    isApiReachable,
    isChecking: false,
    lastChecked: now,
    error: null,
    diagnosis,
    lastSuccessfulCheck: diagnosis === "healthy" ? now : null,
  };
}

/**
 * Hook to check internet connectivity and API reachability
 */
export function useConnectivity(options: UseConnectivityOptions = {}) {
  const { checkInterval = 30000, enabled = true } = options;

  const [state, setState] = useState<ConnectivityState>({
    isOnline: navigator.onLine,
    isApiReachable: false,
    isChecking: false,
    lastChecked: null,
    error: null,
    diagnosis: "unknown",
    lastSuccessfulCheck: null,
  });

  const checkConnectivity = useCallback(async () => {
    if (!enabled) {
      console.log("⏸️ [Connectivity] Check disabled");
      return;
    }

    console.log("🚀 [Connectivity] Manual check triggered");

    // Set checking state
    setState((prev) => {
      console.log("⏳ [Connectivity] Setting isChecking: true");
      return { ...prev, isChecking: true, error: null };
    });

    try {
      const result = await runConnectivityCheck();
      console.log("📊 [Connectivity] Setting final state:", result);
      setState(result);
    } catch (error) {
      console.error("💥 [Connectivity] Check failed completely:", error);
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : "Check failed",
        diagnosis: "unknown",
        lastChecked: new Date(),
      }));
    }
  }, [enabled]);

  // Initial check and periodic checks
  useEffect(() => {
    if (!enabled) {
      console.log("⏸️ [Connectivity] Hook disabled");
      return;
    }

    console.log(
      `🎬 [Connectivity] Starting monitoring (${checkInterval}ms interval)`,
    );

    // Initial check
    checkConnectivity();

    // Periodic checks
    const interval = setInterval(() => {
      console.log("⏰ [Connectivity] Interval check triggered");
      checkConnectivity();
    }, checkInterval);

    // Browser events
    const handleOnline = () => {
      console.log("🟢 [Connectivity] Browser online event");
      checkConnectivity();
    };

    const handleOffline = () => {
      console.log("🔴 [Connectivity] Browser offline event");
      setState((prev) => ({
        ...prev,
        isOnline: false,
        isApiReachable: false,
        diagnosis: "no_internet",
        isChecking: false,
        lastChecked: new Date(),
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      console.log("🧹 [Connectivity] Cleaning up");
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, checkInterval, checkConnectivity]);

  const getDiagnosisMessage = useCallback(() => {
    switch (state.diagnosis) {
      case "healthy":
        return "All systems operational";
      case "no_internet":
        return "No internet connection detected";
      case "api_down":
        return "VoiceGecko servers are unreachable (your internet is working)";
      case "unknown":
      default:
        return "Connectivity issue detected";
    }
  }, [state.diagnosis]);

  // Debug log current state
  console.log("📋 [Connectivity] Current state:", {
    isChecking: state.isChecking,
    diagnosis: state.diagnosis,
    isOnline: state.isOnline,
    isApiReachable: state.isApiReachable,
  });

  return {
    ...state,
    checkConnectivity,
    getDiagnosisMessage,
    hasConnectivityIssue: state.diagnosis !== "healthy",
    isVoiceGeckoIssue: state.diagnosis === "api_down",
    isInternetIssue: state.diagnosis === "no_internet",
  };
}

/**
 * Utility function to check if an error is likely network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : JSON.stringify(error).toLowerCase();

  return (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("aborted") ||
    errorMessage.includes("unreachable") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("load failed") ||
    errorMessage.includes("no internet")
  );
}

/**
 * Utility function to check if a fetch response indicates a network issue
 */
export function isNetworkResponseError(response?: Response): boolean {
  if (!response) return true;
  return response.status >= 500 || response.status === 0;
}
