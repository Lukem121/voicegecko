import { useState } from "react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { Session } from "@acme/auth";

import { AppUpdater } from "~/components/updater";
import { VersionDisplay } from "~/components/version-display";
import { useIsAuthenticated } from "~/hooks/auth";
import { authClient } from "~/lib/client";

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
  const [state, setState] = useState(0);
  const auth = useIsAuthenticated();
  const { refetch } = authClient.useSession();

  return (
    <>
      <div>Auth userID: {auth.user?.id}</div>
      <button onClick={() => refetch()}>Refetch</button>
      <button onClick={() => setState((prev) => prev + 1)}>
        State: {state}
      </button>
      <Outlet />
      <AppUpdater />
      <VersionDisplay />
    </>
  );
}
