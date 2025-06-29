import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { authClient } from "../auth/client";

export const Route = createRootRoute({
  component: RouteLayout,
});

function RouteLayout() {
  useBetterAuthTauri({
    authClient,
    scheme: "voicegecko",
    debugLogs: false,
    onRequest: (href) => {
      console.log("Auth request:", href);
    },
    onSuccess: (callbackURL) => {
      console.log("Auth successful", callbackURL);
      // Navigate or update UI as needed
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
