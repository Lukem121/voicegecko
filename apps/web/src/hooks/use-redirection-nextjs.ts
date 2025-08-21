/**
 * Next.js specific redirection hooks
 */

import type { UserIntent } from '@acme/utils/redirection';
import {
  getAndClearRedirectDestination,
  useRedirection,
} from '@acme/utils/use-redirection';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Next.js specific redirection hook with router integration
 */
export function useRedirectionNextjs(
  options: { fallbackUrl?: string; clearAfterResolve?: boolean } = {}
) {
  const router = useRouter();
  const { fallbackUrl = '/app' } = options;
  const baseRedirection = useRedirection();

  const resolveAndNavigate = useCallback(() => {
    const destination = getAndClearRedirectDestination(fallbackUrl);
    router.push(destination);
  }, [router, fallbackUrl]);

  const navigateWithIntent = useCallback(
    (
      targetUrl: string,
      intentType: UserIntent['intentType'],
      context?: UserIntent['context']
    ) => {
      // Store current location as intent
      const currentUrl =
        typeof window !== 'undefined' ? window.location.href : '';

      baseRedirection.storeIntent({
        originalUrl: currentUrl,
        intentType,
        context,
        fallbackUrl,
      });

      // Navigate to target
      router.push(targetUrl);
    },
    [router, fallbackUrl, baseRedirection]
  );

  return {
    ...baseRedirection,
    resolveAndNavigate,
    navigateWithIntent,
  };
}

/**
 * Hook specifically for authentication flows
 */
export function useAuthRedirection() {
  const redirection = useRedirectionNextjs({ fallbackUrl: '/app' });

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
  const redirection = useRedirectionNextjs({ fallbackUrl: '/app/plans' });

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
