/* eslint-disable @typescript-eslint/only-throw-error */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@acme/ui/components/ui/sidebar";

import { AppSidebar } from "~/components/app-sidebar";
import {
  ConnectivityError,
  ConnectivityIndicator,
} from "~/components/connectivity-error";
import { TitleBar } from "~/components/custom-title-bar";
import { useAuthWithConnectivity } from "~/hooks/use-auth-with-connectivity";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    const authIssueType = context.auth.getAuthIssueType?.() ?? "loading";

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
  // Use the new clean auth hook with connectivity integration
  const auth = useAuthWithConnectivity();
  const authIssueType = auth.getAuthIssueType();

  console.log("[AuthenticatedLayout] Auth issue type:", authIssueType, auth);

  // Show connectivity error when there are network issues
  if (authIssueType === "connectivity") {
    console.log("Showing connectivity error...");
    return (
      <ConnectivityError
        isOnline={auth.connectivity.isOnline}
        isApiReachable={auth.connectivity.isApiReachable}
        isChecking={auth.connectivity.isChecking}
        diagnosis={auth.connectivity.diagnosis}
        lastSuccessfulCheck={auth.connectivity.lastSuccessfulCheck}
        onRetry={() => {
          console.log("Retrying connectivity check...");
          void auth.connectivity.checkConnectivity();
        }}
      />
    );
  }

  // User is authenticated, render the protected content with sidebar
  return (
    <>
      <SidebarProvider>
        <TitleBar />
        <AppSidebar />
        <SidebarInset className="!ml-0 pt-8 !shadow-none">
          {/* Show connectivity indicator when there are issues */}
          <div className="absolute top-10 right-4 z-50">
            <ConnectivityIndicator
              isOnline={auth.connectivity.isOnline}
              isApiReachable={auth.connectivity.isApiReachable}
              isChecking={auth.connectivity.isChecking}
              diagnosis={auth.connectivity.diagnosis}
              lastChecked={auth.connectivity.lastSuccessfulCheck}
            />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
