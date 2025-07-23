import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isRegistered, register } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";

import { authClient } from "~/lib/client";
import { isNetworkError, useConnectivity } from "./use-connectivity";

export const signIn = async () => {
  const signInUrl = `${import.meta.env.VITE_PUBLIC_VOICEGECKO_URL}/api/auth/signin?redirect=voicegecko://login`;
  await openUrl(signInUrl);
};

export const useUser = () => {
  const session = authClient.useSession();
  return session.data?.user ?? null;
};

/**
 * Check if user is authenticated (for use in components)
 */
export const useIsAuthenticated = () => {
  const { data: session, isPending, error } = authClient.useSession();
  const connectivity = useConnectivity({ checkInterval: 15000 }); // Check every 15 seconds

  console.log("useIsAuthenticated", session, isPending, error);

  useEffect(() => {
    if (error) {
      console.error("Auth error", error);
    }
  }, [error]);

  // Determine if the auth error is likely due to connectivity issues
  const isConnectivityError =
    error && (isNetworkError(error) || connectivity.hasConnectivityIssue);

  return {
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    user: session?.user ?? null,
    // Enhanced connectivity information
    connectivity: {
      isOnline: connectivity.isOnline,
      isApiReachable: connectivity.isApiReachable,
      isChecking: connectivity.isChecking,
      hasConnectivityIssue: connectivity.hasConnectivityIssue,
      checkConnectivity: connectivity.checkConnectivity,
      // Enhanced diagnostic information
      diagnosis: connectivity.diagnosis,
      getDiagnosisMessage: connectivity.getDiagnosisMessage,
      lastSuccessfulCheck: connectivity.lastSuccessfulCheck,
      isVoiceGeckoIssue: connectivity.isVoiceGeckoIssue,
      isInternetIssue: connectivity.isInternetIssue,
    },
    // Error handling
    error,
    isConnectivityError: !!isConnectivityError,
    // Helper to determine what kind of issue we're dealing with
    getAuthIssueType: () => {
      if (isPending) return "loading";
      if (isConnectivityError) return "connectivity";
      if (error) return "auth";
      if (!session?.user) return "unauthenticated";
      return "authenticated";
    },
  };
};

export const useSignIn = () => {
  const router = useRouter();
  return async () => {
    if (!(await isRegistered("voicegecko"))) {
      await register("voicegecko");
      console.log('Registered "voicegecko"');
    }

    await signIn();
    return router.navigate({ to: "/" });
  };
};

export const useSignOut = () => {
  const router = useRouter();

  return async () => {
    console.log("🚪 Signing out...");
    await authClient.signOut();
    return router.navigate({ to: "/sign-in", search: { redirect: null } });
  };
};
