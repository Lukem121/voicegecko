import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { Session } from "@acme/auth";
import { authClient } from "@acme/auth/client";

// Define the router context interface
interface MyRouterContext {
  auth: {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: Session["user"] | null;
  };
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RouteLayout,
});

function RouteLayout() {
  const { refetch } = authClient.useSession();

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
