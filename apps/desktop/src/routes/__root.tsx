import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { authClient } from "../auth/client";
import { useAuthSync } from "../hooks/auth";

export const Route = createRootRoute({
  component: RouteLayout,
});

function RouteLayout() {
  // Sync better-auth session with Tauri store for performance
  const { isAuthenticated } = useAuthSync();

  useBetterAuthTauri({
    authClient,
    scheme: "voicegecko",
    debugLogs: true,
    onRequest: (href) => {
      console.log("Auth request:", href);
    },
    onSuccess: (callbackURL) => {
      console.log("Auth successful", callbackURL);
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
