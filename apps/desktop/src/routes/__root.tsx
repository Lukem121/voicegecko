import { useState } from "react";
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from "@tanstack/react-router";

import type { Session } from "@acme/auth";

import { AppUpdater } from "~/components/updater";
import { VersionDisplay } from "~/components/version-display";
import { useIsAuthenticated, useSignOut } from "~/hooks/auth";
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
  const router = useRouter();
  const [state, setState] = useState(0);
  const auth = useIsAuthenticated();
  const { refetch } = authClient.useSession();
  const signOut = useSignOut();

  return (
    <>
      <div>Auth userID: {auth.user?.id}</div>
      <button onClick={() => refetch()}>Refetch</button>
      <button onClick={() => setState((prev) => prev + 1)}>
        State: {state}
      </button>
      <button onClick={() => router.invalidate()}>Invalidate</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <Outlet />
      <AppUpdater />
      <VersionDisplay />
    </>
  );
}
