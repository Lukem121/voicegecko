import { log } from '@acme/observability/log';
import { StrictMode, useEffect, useState } from 'react';

import { authClient } from '~/lib/client';

import '@acme/ui/globals.css';
import '~/styles/fonts.css';

import type { FetchError } from '@acme/auth/tauri';
import { useBetterAuthTauri } from '@acme/auth/tauri';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';

import { AppLauncher } from '~/components/app-launcher';
import { FullscreenDetector } from '~/components/fullscreen-detector';
import { GeckoBarWindow } from '~/components/gecko-bar-window';
import { useAuthWithConnectivity } from '~/hooks/use-auth-with-connectivity';
import { appLifecycle } from '~/lib/app-lifecycle';
import { setNavigator } from '~/lib/router';
import { isGeckoBarWindow } from '~/lib/window-detection';
import { routeTree } from '~/routeTree.gen';
import { useSettingsStore } from '~/stores/settings.store';
import { TRPCReactProvider } from '~/trpc';
import { useSession } from './hooks/auth';
import { analytics, useAnalyticsInit } from './lib/analytics/posthog-analytics';
import PostHogProvider from './lib/posthog/posthog-provider';
import { ThemeProvider } from './providers/theme';
import { useAuthStore } from './stores/auth.store';

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    auth: {
      isAuthenticated: false,
      isLoading: true,
      user: null,
    },
  },
});

// Expose navigation for non-React modules (e.g., network layer)
setNavigator((opts) => router.navigate(opts as never));

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  // biome-ignore lint/nursery/useConsistentTypeDefinitions: TanStack Router types
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useAuthWithConnectivity();
  const { session, query } = useSession();
  const settings = useSettingsStore((state) => state.settings);

  // Initialize PostHog analytics
  useAnalyticsInit();

  // Track user identification and authentication state changes
  useEffect(() => {
    if (session?.user) {
      // Identify user with PostHog
      analytics.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
        username: session.user.username,
        email_verified: session.user.emailVerified,
        created_at: session.user.createdAt,
        role: session.user.role,
      });

      // Track sign in event
      analytics.track('user_signed_in', {
        method: 'email', // Could be enhanced to detect actual method
        returning_user: true, // Could be enhanced with proper detection
      });
    } else if (!(auth.isLoading || auth.isAuthenticated)) {
      // Reset analytics on sign out
      analytics.reset();
      analytics.track('user_signed_out', {});
    }
  }, [session?.user, auth.isAuthenticated, auth.isLoading]);

  useBetterAuthTauri({
    authClient,
    scheme: 'voicegecko',
    debugLogs: true,
    onRequest: (href: string) => {
      log.info('🔄 Auth request:', href);
    },
    onSuccess: (callbackURL?: string | null) => {
      log.info('✅ Auth successful, callback URL:', callbackURL);
      // Clear any prior auth error
      try {
        useAuthStore.getState().setError(null);
      } catch (e) {
        log.error('[Auth] Failed to clear auth error in store', e);
      }
      query
        .refetch()
        .catch((e) =>
          log.error('[Auth] Failed to refetch session after success', e)
        );
      router
        .invalidate()
        .catch((e) =>
          log.error('[Auth] Failed to invalidate router after success', e)
        );
      // Proactively navigate to the desired page to avoid getting stuck on sign-in
      const target = callbackURL?.startsWith('/') ? callbackURL : '/';
      router
        .navigate({ to: target })
        .catch((e) => log.error('[Auth] Navigate after success failed', e));
    },
    onError: (error: FetchError) => {
      log.error('❌ Auth error:', error);
      // Surface auth errors (including rate limits) to the UI
      const message = (
        error.message ??
        error.statusText ??
        'Authentication failed'
      ).trim();
      try {
        useAuthStore.getState().setError(message);
      } catch (e) {
        // Non-fatal
        log.error('[Auth] Failed to set auth error in store', e);
      }
    },
  });

  useEffect(() => {
    log.info('Auth state changed', session, query.isPending);
    router.invalidate();
  }, [session, query.isPending]);

  return (
    <>
      <FullscreenDetector
        enabled={
          settings.general.showGeckoBar &&
          settings.general.hideGeckoOnFullscreen
        }
        geckoBarEnabled={settings.general.showGeckoBar}
      />
      <RouterProvider context={{ auth }} router={router} />
    </>
  );
}

function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const isGeckoBar = isGeckoBarWindow();

  // Track app startup time
  useEffect(() => {
    if (!isGeckoBar) {
      sessionStorage.setItem('appStartTime', Date.now().toString());
    }
  }, [isGeckoBar]);

  // If this is the gecko bar window, render the gecko bar app with essential initialization
  if (isGeckoBar) {
    return <GeckoBarWindow />;
  }

  // Otherwise, this is the main window
  if (!isAppReady) {
    return <AppLauncher onReady={() => setIsAppReady(true)} />;
  }

  return <InnerApp />;
}

// Initialize core systems BEFORE React starts (but only for main window)
async function initializeApp() {
  // Skip initialization entirely if this is the gecko bar window
  if (isGeckoBarWindow()) {
    log.info(
      '[Main] 🎨 Gecko bar window detected, skipping core initialization'
    );
    return;
  }

  try {
    log.info(
      '[Main] 🚀 Starting core systems initialization (main window only)...'
    );

    // Initialize core systems (but NOT updates - those need UI feedback)
    await appLifecycle.initializeCoreSystemsOnce();

    // Schedule periodic update checks every 12 hours
    appLifecycle.schedulePeriodicChecks(12 * 60 * 60 * 1000);

    log.info('[Main] ✅ Core systems initialization complete');
  } catch (error) {
    log.error('[Main] ❌ Core systems initialization failed:', error);
    // Continue with React startup even if initialization fails
  }
}

// Render the app
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root not in body');
}

if (!rootElement.innerHTML) {
  // Run app initialization, then start React
  initializeApp()
    .then(() => {
      log.info('[Main] 🎨 Starting React application...');

      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <StrictMode>
          <TRPCReactProvider>
            <PostHogProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </PostHogProvider>
          </TRPCReactProvider>
        </StrictMode>
      );
    })
    .catch((error) => {
      log.error('[Main] Failed to initialize app:', error);

      // Still start React even if initialization fails
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <StrictMode>
          <TRPCReactProvider>
            <PostHogProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </PostHogProvider>
          </TRPCReactProvider>
        </StrictMode>
      );
    });
}
