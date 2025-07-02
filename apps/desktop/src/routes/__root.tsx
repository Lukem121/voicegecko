import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { Session } from "@acme/auth";

import { authClient } from "../auth/client";
import { useAuthSync } from "../hooks/auth";

// Define the router context interface
interface MyRouterContext {
  auth: {
    isAuthenticated: boolean;
    isLoading: boolean;
    session: Session | null;
  };
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RouteLayout,
});

function RouteLayout() {
  const { refetch } = authClient.useSession();

  // Sync better-auth session with Tauri store for performance
  useAuthSync();

  useBetterAuthTauri({
    authClient,
    scheme: "voicegecko",
    debugLogs: true,
    onRequest: (href) => {
      console.log("Auth request:", href);
    },
    onSuccess: (callbackURL) => {
      console.log("Auth successful", callbackURL);
      refetch();
      // The useAuthSync hook will automatically sync the new session
    },
    onError: (error) => {
      console.error("Auth error:", error);
      // Show error notification
    },
  });

  return (
    <>
      <Outlet />
    </>
  );
}
