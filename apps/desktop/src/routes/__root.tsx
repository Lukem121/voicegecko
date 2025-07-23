import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { Session } from "@acme/auth";

import { VersionDisplay } from "~/components/version-display";

// Define the router context interface
interface MyRouterContext {
  auth: {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: Session["user"] | null;
    connectivity?: {
      isOnline: boolean;
      isApiReachable: boolean;
      isChecking: boolean;
      hasConnectivityIssue: boolean;
      checkConnectivity: () => void;
      // Enhanced diagnostic information
      diagnosis: "healthy" | "no_internet" | "api_down" | "unknown";
      getDiagnosisMessage: () => string;
      lastSuccessfulCheck: Date | null;
      isVoiceGeckoIssue: boolean;
      isInternetIssue: boolean;
    };
    error?: unknown;
    isConnectivityError?: boolean;
    getAuthIssueType?: () =>
      | "loading"
      | "connectivity"
      | "auth"
      | "unauthenticated"
      | "authenticated";
  };
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RouteLayout,
});

function RouteLayout() {
  return (
    <>
      <Outlet />
      <VersionDisplay />
    </>
  );
}
