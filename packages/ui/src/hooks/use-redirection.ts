/**
 * React hook for managing redirections with preserved user intent
 */

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { UserIntent } from '../lib/redirection';
import {
  clearUserIntent,
  createPaymentUrls,
  createRedirectUrl,
  resolveRedirectDestination,
  retrieveUserIntent,
  storeUserIntent,
} from '../lib/redirection';

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
 */
export function useRedirection(
  options: UseRedirectionOptions = {}
): RedirectionActions {
  const router = useRouter();
  const { fallbackUrl = '/app', clearAfterResolve = true } = options;

  const storeIntent = useCallback((intent: Omit<UserIntent, 'timestamp'>) => {
    storeUserIntent(intent);
  }, []);

  const getCurrentIntent = useCallback(() => {
    return retrieveUserIntent();
  }, []);

  const clearIntent = useCallback(() => {
    clearUserIntent();
  }, []);

  const resolveAndNavigate = useCallback(() => {
    const destination = resolveRedirectDestination(fallbackUrl);

    if (clearAfterResolve) {
      clearUserIntent();
    }

    router.push(destination);
  }, [router, fallbackUrl, clearAfterResolve]);

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

  const navigateWithIntent = useCallback(
    (
      targetUrl: string,
      intentType: UserIntent['intentType'],
      context?: UserIntent['context']
    ) => {
      // Store current location as intent
      const currentUrl =
        typeof window !== 'undefined' ? window.location.href : '';

      storeUserIntent({
        originalUrl: currentUrl,
        intentType,
        context,
        fallbackUrl,
      });

      // Navigate to target
      router.push(targetUrl);
    },
    [router, fallbackUrl]
  );

  return {
    storeIntent,
    getCurrentIntent,
    clearIntent,
    resolveAndNavigate,
    createRedirectUrl: handleCreateRedirectUrl,
    createPaymentUrls: handleCreatePaymentUrls,
    navigateWithIntent,
  };
}

/**
 * Hook specifically for authentication flows
 */
export function useAuthRedirection() {
  const redirection = useRedirection({ fallbackUrl: '/app' });

  const redirectToSignIn = useCallback(
    (
      options: {
        from?: string;
        context?: UserIntent['context'];
        fallbackUrl?: string;
      } = {}
    ) => {
      const currentUrl =
        options.from ||
        (typeof window !== 'undefined' ? window.location.href : '');

      const intent: Omit<UserIntent, 'timestamp'> = {
        originalUrl: currentUrl,
        intentType: 'auth',
        context: options.context,
        fallbackUrl: options.fallbackUrl || '/app',
      };

      const redirectUrl = redirection.createRedirectUrl('/sign-in', intent);
      window.location.href = redirectUrl;
    },
    [redirection]
  );

  const handleAuthSuccess = useCallback(() => {
    redirection.resolveAndNavigate();
  }, [redirection]);

  return {
    ...redirection,
    redirectToSignIn,
    handleAuthSuccess,
  };
}

/**
 * Hook specifically for payment flows
 */
export function usePaymentRedirection() {
  const redirection = useRedirection({ fallbackUrl: '/app/plans' });

  const createPaymentSession = useCallback(
    (
      upgradeFunction: (
        planParam: string,
        annualParam: boolean,
        options: { successUrl: string; cancelUrl: string }
      ) => Promise<void>,
      planName: string,
      isAnnual = false
    ) => {
      const intent = redirection.getCurrentIntent();
      const { successUrl, cancelUrl } = redirection.createPaymentUrls(
        '/app/plans?sub_success=true',
        '/app/plans',
        !!intent
      );

      return upgradeFunction(planName, isAnnual, {
        successUrl,
        cancelUrl,
      });
    },
    [redirection]
  );

  const handlePaymentSuccess = useCallback(() => {
    // Small delay to ensure payment processing is complete
    setTimeout(() => {
      redirection.resolveAndNavigate();
    }, 100);
  }, [redirection]);

  return {
    ...redirection,
    createPaymentSession,
    handlePaymentSuccess,
  };
}
