import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { useIsAuthenticated } from "~/hooks/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Authentication Guard Component
 * Wraps protected routes and redirects to sign-in if user is not authenticated
 */
export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're not loading and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      console.log("🚫 User not authenticated, redirecting to sign-in");
      router.navigate({ to: "/auth/sign-in" });
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Show fallback or nothing if not authenticated
  if (!isAuthenticated) {
    return fallback || null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

/**
 * Higher-order component for protecting routes
 */
export const withAuthGuard = <P extends object>(
  Component: React.ComponentType<P>,
) => {
  return (props: P) => (
    <AuthGuard>
      <Component {...props} />
    </AuthGuard>
  );
};
