import { log } from '@acme/observability/log';
import { StrictMode, useEffect, useState } from 'react';

import { authClient } from '~/lib/client';

import '@acme/ui/globals.css';
import '~/styles/fonts.css';

import { useBetterAuthTauri } from '@daveyplate/better-auth-tauri/react';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';

import { AppLauncher } from '~/components/app-launcher';
import { FullscreenDetector } from '~/components/fullscreen-detector';
import { GeckoBarApp } from '~/components/gecko-bar/gecko-bar-app';
import { useAuthWithConnectivity } from '~/hooks/use-auth-with-connectivity';
import { appLifecycle } from '~/lib/app-lifecycle';
import { isGeckoBarWindow } from '~/lib/window-detection';
import { routeTree } from '~/routeTree.gen';
import { useSettingsStore } from '~/stores/settings.store';
import { TRPCReactProvider } from '~/trpc';
import { useSession } from './hooks/auth';
import { analytics, useAnalyticsInit } from './lib/analytics/posthog-analytics';
import PostHogProvider from './lib/posthog/posthog-provider';
import { ThemeProvider } from './providers/theme';

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
    if (session?.user && auth.isAuthenticated) {
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
    onRequest: (href) => {
      log.info('🔄 Auth request:', href);
    },
    onSuccess: (callbackURL) => {
      log.info('✅ Auth successful, callback URL:', callbackURL);

      // Refetch session and wait for auth state to update
      query
        .refetch()
        .then(() => {
          // Give a small delay to ensure auth context updates
          setTimeout(() => {
            const targetUrl = callbackURL || '/';
            log.info('🔄 Navigating to:', targetUrl);
            router.navigate({ to: targetUrl }).catch((error) => {
              log.error('Navigation failed:', error);
              // Fallback: force page refresh to reset state if navigation fails
              log.info('🔄 Fallback: forcing page refresh');
              window.location.href = targetUrl;
            });
          }, 200);
        })
        .catch((error) => {
          log.error('Session refetch failed:', error);
          // Still try to navigate even if refetch fails
          const targetUrl = callbackURL || '/';
          router.navigate({ to: targetUrl }).catch(() => {
            window.location.href = targetUrl;
          });
        });
    },
    onError: (error) => {
      log.error('❌ Auth error:', error);
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

  // If this is the gecko bar window, render the gecko bar app directly
  if (isGeckoBar) {
    return <GeckoBarApp />;
  }

  // Otherwise, this is the main window
  if (!isAppReady) {
    return <AppLauncher onReady={() => setIsAppReady(true)} />;
  }

  return <InnerApp />;
}

// Initialize core systems BEFORE React starts (but not updates - that needs UI)
async function initializeApp() {
  try {
    log.info('[Main] 🚀 Starting core systems initialization...');

    // Initialize core systems (but NOT updates - those need UI feedback)
    await appLifecycle.initializeCoreSystemsOnce();

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
