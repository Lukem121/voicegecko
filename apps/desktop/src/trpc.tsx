import type { AppRouter } from '@acme/api/src/root';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

import { isNetworkError } from './hooks/auth';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
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
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        }).catch((error) => {
          // Enhance fetch errors with better error messages
          if (
            error.name === 'TypeError' &&
            error.message === 'Failed to fetch'
          ) {
            throw new Error(
              'Network error: Unable to connect to VoiceGecko servers. Please check your internet connection.'
            );
          }
          if (error.name === 'AbortError') {
            throw new Error(
              'Network error: Request timed out. Please check your internet connection.'
            );
          }
          throw error;
        });
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
