import type { AppRouter } from '@acme/api/src/root';
import { log } from '@acme/observability/log';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getVersion } from '@tauri-apps/api/app';
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

import { isNetworkError } from './hooks/auth';
import { authClient } from './lib/client';
import { navigate } from './lib/router';

/**
 * Handle 401 Unauthorized errors by logging out the user
 */
let isHandling401 = false; // Prevent multiple simultaneous logout attempts
let isInitializing = false; // Track if we're in app initialization phase

/**
 * Set the initialization flag to prevent 401 logout during app startup
 */
export const setInitializationFlag = (initializing: boolean) => {
  isInitializing = initializing;
  log.info(`[TRPC] Initialization flag set to: ${initializing}`);
};

const handle401Error = async () => {
  if (isHandling401) {
    return; // Already handling a 401, don't trigger multiple logouts
  }

  // Don't handle 401 errors during initialization - let auth flow handle it
  if (isInitializing) {
    log.warn(
      '⚠️ Received 401 during initialization - skipping automatic logout to prevent loops'
    );
    return;
  }

  isHandling401 = true;

  try {
    log.warn(
      '🚨 Session expired - 401 Unauthorized detected. Clearing session...'
    );

    // Try to clear the auth session (may fail if already expired)
    try {
      await authClient.signOut();
    } catch (signOutError) {
      log.info(
        'Sign out failed (expected if session already expired):',
        signOutError
      );
    }

    const options = trpc.auth.getSession.queryKey();
    await queryClient.invalidateQueries({ queryKey: options });

    // Clear all query cache to remove stale data
    queryClient.clear();

    // Don't use window.location.href - let the router handle navigation!
    // The router will detect the auth state change and redirect appropriately
    // This prevents page refresh loops
    log.info('✅ Session cleared - router will handle redirect');
  } catch (error) {
    log.error(error, 'Error during session cleanup:');
    // Even if cleanup fails, the router should still handle the redirect
  } finally {
    // Reset the flag after a shorter delay since we're not doing redirects
    setTimeout(() => {
      isHandling401 = false;
    }, 1000);
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 401 errors - these indicate authentication issues
        if (
          error instanceof TRPCClientError &&
          error.data?.httpStatus === 401
        ) {
          return false;
        }

        // Don't retry network errors more than 2 times
        if (isNetworkError(error)) {
          return failureCount < 2;
        }

        // For other errors, use default retry logic (3 times)
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter for network errors
        return Math.min(
          1000 * 2 ** attemptIndex + Math.random() * 1000,
          30_000
        );
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry 401 errors - these indicate authentication issues
        if (
          error instanceof TRPCClientError &&
          error.data?.httpStatus === 401
        ) {
          return false;
        }

        // Don't retry mutations on network errors to avoid duplicate actions
        if (isNetworkError(error)) {
          return false;
        }

        return failureCount < 1; // Only retry once for non-network errors
      },
    },
  },
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_PUBLIC_VOICEGECKO_URL}/api/trpc`,
      transformer: superjson,
      async fetch(url, options) {
        try {
          const clientVersion = await getVersion().catch(() => 'unknown');
          const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              ...(options?.headers ?? {}),
              'x-client-version': clientVersion,
              // Single channel MVP: no channel header
            },
          });

          // Check for 401 Unauthorized response
          if (response.status === 401) {
            log.warn('🚨 Received 401 Unauthorized response from API');

            // Don't await this to avoid blocking the current request
            handle401Error().catch((error) => {
              log.error(error, 'Error handling 401:');
            });

            // Still return the response to let TRPC handle the error appropriately
            return response;
          }

          // Handle 426 Upgrade Required (min supported version)
          if (response.status === 426) {
            log.warn('🚨 Received 426 Upgrade Required from API');
            // Navigate user to update page and start forced update in the background
            // Don't await navigation to avoid blocking
            navigate({ to: '/update-required', replace: true }).catch((e) => {
              log.error(e, 'Failed to navigate to update-required:');
            });
            // Start the update without blocking fetch
            import('./lib/app-lifecycle')
              .then((m) => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                m.appLifecycle.forceUpdateNow();
              })
              .catch((e) => log.error(e, 'Failed to load appLifecycle:'));

            return response;
          }

          return response;
        } catch (error) {
          // Enhance fetch errors with better error messages
          if (
            error instanceof Error &&
            error.name === 'TypeError' &&
            error.message === 'Failed to fetch'
          ) {
            throw new Error(
              'Network error: Unable to connect to VoiceGecko servers. Please check your internet connection.'
            );
          }
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(
              'Network error: Request timed out. Please check your internet connection.'
            );
          }
          throw error;
        }
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export const TRPCReactProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
