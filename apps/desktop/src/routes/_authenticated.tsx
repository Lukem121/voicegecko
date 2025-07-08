/* eslint-disable @typescript-eslint/only-throw-error */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LucideLoader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    // Check if user is authenticated
    if (!context.auth.isLoading && !context.auth.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const authContext = Route.useRouteContext().auth;

  // Show loading state while checking authentication
  if (authContext.isLoading) {
    console.log("Checking authentication...");
    return (
      <div className="flex h-screen items-center justify-center">
        <LucideLoader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // User is authenticated, render the protected content
  return (
    <>
      <Outlet />
    </>
  );
}
