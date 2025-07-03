/* eslint-disable @typescript-eslint/only-throw-error */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    // Check if user is authenticated
    if (!context.auth.isLoading && !context.auth.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          // Use the current location to power a redirect after login
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
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <Outlet />;
}
