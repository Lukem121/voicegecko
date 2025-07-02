/* eslint-disable @typescript-eslint/only-throw-error */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    // Check if user is authenticated
    if (!context.auth.isLoading && !context.auth.isAuthenticated) {
      console.log("🚫 User not authenticated, redirecting to sign-in");
      throw redirect({
        to: "/auth/sign-in",
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
  // Show loading state while checking authentication
  if (Route.useRouteContext().auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Checking authentication... 3</div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <Outlet />;
}
