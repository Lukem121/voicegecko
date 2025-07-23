/* eslint-disable @typescript-eslint/only-throw-error */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { Separator } from "@acme/ui/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@acme/ui/components/ui/sidebar";

import { AppBreadcrumb } from "~/components/app-breadcrumb";
import { AppSidebar } from "~/components/app-sidebar";
import {
  ConnectivityError,
  ConnectivityIndicator,
} from "~/components/connectivity-error";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    const authIssueType = context.auth.getAuthIssueType?.() || "loading";

    console.log("[_authenticated beforeLoad] Auth issue type:", authIssueType);

    // Since AppLauncher waits for auth to be resolved, we should only see:
    // - "connectivity" - show connectivity error component
    // - "auth" or "unauthenticated" - redirect to sign-in
    // - "authenticated" - proceed normally

    // If it's a connectivity issue, let the component handle it (don't redirect)
    if (authIssueType === "connectivity") {
      return;
    }

    // Only redirect to sign-in for actual auth issues or unauthenticated users
    if (authIssueType === "auth" || authIssueType === "unauthenticated") {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href,
        },
      });
    }

    // At this point, user should be authenticated since AppLauncher waited for auth
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const authContext = Route.useRouteContext().auth;
  const authIssueType = authContext.getAuthIssueType?.() || "authenticated";

  console.log(
    "[AuthenticatedLayout] Auth issue type:",
    authIssueType,
    authContext,
  );

  // Show connectivity error when there are network issues
  if (authIssueType === "connectivity") {
    console.log("Showing connectivity error...");
    return (
      <ConnectivityError
        isOnline={authContext.connectivity?.isOnline ?? false}
        isApiReachable={authContext.connectivity?.isApiReachable ?? false}
        isChecking={authContext.connectivity?.isChecking ?? false}
        diagnosis={authContext.connectivity?.diagnosis ?? "unknown"}
        lastSuccessfulCheck={authContext.connectivity?.lastSuccessfulCheck}
        onRetry={() => {
          console.log("Retrying connectivity check...");
          authContext.connectivity?.checkConnectivity?.();
        }}
      />
    );
  }

  // User is authenticated, render the protected content with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="!ml-0">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumb />
          </div>
          {/* Show connectivity indicator in header when there are issues */}
          <div className="ml-auto pr-4">
            <ConnectivityIndicator
              isOnline={authContext.connectivity?.isOnline ?? true}
              isApiReachable={authContext.connectivity?.isApiReachable ?? true}
              isChecking={authContext.connectivity?.isChecking ?? false}
              diagnosis={authContext.connectivity?.diagnosis ?? "healthy"}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
