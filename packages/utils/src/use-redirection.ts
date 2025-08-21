/**
 * React hook for managing redirections with preserved user intent
 */

import { useCallback } from 'react';
import type { UserIntent } from './redirection';
import {
  clearUserIntent,
  createPaymentUrls,
  createRedirectUrl,
  resolveRedirectDestination,
  retrieveUserIntent,
  storeUserIntent,
} from './redirection';

export type UseRedirectionOptions = {
  /** Default fallback URL if no intent is stored */
  fallbackUrl?: string;
  /** Whether to clear intent after resolving redirect */
  clearAfterResolve?: boolean;
};

export type RedirectionActions = {
  /** Store user intent for later retrieval */
  storeIntent: (intent: Omit<UserIntent, 'timestamp'>) => void;
  /** Get currently stored user intent */
  getCurrentIntent: () => UserIntent | null;
  /** Clear stored user intent */
  clearIntent: () => void;
  /** Resolve and navigate to intended destination */
  resolveAndNavigate: () => void;
  /** Create a redirect URL that preserves current intent */
  createRedirectUrl: (
    targetUrl: string,
    intent: Omit<UserIntent, 'timestamp'>
  ) => string;
  /** Create payment URLs that preserve user intent */
  createPaymentUrls: (
    baseSuccessUrl: string,
    baseCancelUrl: string,
    preserveIntent?: boolean
  ) => { successUrl: string; cancelUrl: string };
  /** Navigate to a URL after storing current page as intent */
  navigateWithIntent: (
    targetUrl: string,
    intentType: UserIntent['intentType'],
    context?: UserIntent['context']
  ) => void;
};

/**
 * Hook for managing user redirections with preserved intent
 *
 * Note: This hook is framework-agnostic - you'll need to provide your own router
 */
export function useRedirection(): Omit<
  RedirectionActions,
  'resolveAndNavigate' | 'navigateWithIntent'
> {
  const storeIntent = useCallback((intent: Omit<UserIntent, 'timestamp'>) => {
    storeUserIntent(intent);
  }, []);

  const getCurrentIntent = useCallback(() => {
    return retrieveUserIntent();
  }, []);

  const clearIntent = useCallback(() => {
    clearUserIntent();
  }, []);

  const handleCreateRedirectUrl = useCallback(
    (targetUrl: string, intent: Omit<UserIntent, 'timestamp'>) => {
      return createRedirectUrl(targetUrl, intent);
    },
    []
  );

  const handleCreatePaymentUrls = useCallback(
    (baseSuccessUrl: string, baseCancelUrl: string, preserveIntent = true) => {
      return createPaymentUrls(baseSuccessUrl, baseCancelUrl, preserveIntent);
    },
    []
  );

  return {
    storeIntent,
    getCurrentIntent,
    clearIntent,
    createRedirectUrl: handleCreateRedirectUrl,
    createPaymentUrls: handleCreatePaymentUrls,
  };
}

/**
 * Gets the redirect destination and clears the intent
 * This is a standalone function since navigation is framework-specific
 */
export function getAndClearRedirectDestination(fallbackUrl = '/app'): string {
  return resolveRedirectDestination(fallbackUrl);
}
