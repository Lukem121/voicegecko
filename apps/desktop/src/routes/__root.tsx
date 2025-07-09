import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { Session } from "@acme/auth";

import { AppUpdater } from "~/components/updater";
import { VersionDisplay } from "~/components/version-display";

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
  return (
    <>
      <Outlet />
      <AppUpdater />
      <VersionDisplay />
    </>
  );
}
