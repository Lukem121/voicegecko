/**
 * Page Tracker Component
 *
 * Automatically tracks page views and navigation patterns
 * using TanStack Router's hooks
 */

import React, { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { analytics } from "~/lib/analytics/posthog-analytics";

export function PageTracker() {
  const router = useRouterState();

  useEffect(() => {
    // Get current route information
    const currentLocation = router.location;
    const currentRoute = router.matches?.[router.matches.length - 1];

    if (currentLocation && currentRoute) {
      // Extract page name from route
      const pageName = currentRoute.routeId || currentLocation.pathname;
      const pagePath = currentLocation.pathname;

      // Track page view
      analytics.trackPageView(pageName, pagePath);

      console.log(`[Analytics] Page viewed: ${pageName} (${pagePath})`);
    }
  }, [router.location.pathname]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for manual page tracking
 */
export function usePageTracking() {
  const router = useRouterState();

  const trackPage = React.useCallback(
    (customPageName?: string) => {
      const currentLocation = router.location;
      const currentRoute = router.matches?.[router.matches.length - 1];

      if (currentLocation && currentRoute) {
        const pageName =
          customPageName || currentRoute.routeId || currentLocation.pathname;
        const pagePath = currentLocation.pathname;

        analytics.trackPageView(pageName, pagePath);
      }
    },
    [router.location, router.matches],
  );

  return { trackPage };
}
