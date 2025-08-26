import { log } from '@acme/observability/log';
import type { FetchError } from '../types/fetch-error';
import type { SetupBetterAuthTauriOptions } from './setup-better-auth-tauri';

export async function handleAuthDeepLink({
  authClient,
  debugLogs,
  scheme,
  url,
  onError,
  onRequest,
  onSuccess,
}: SetupBetterAuthTauriOptions & { url: string }) {
  const basePath = '/api/auth/';

  const newUrl = new URL(url);

  // Deduplicate by OAuth state to avoid processing the same deep link twice
  const state = newUrl.searchParams.get('state');
  if (state) {
    try {
      const key = 'processedAuthStates';
      const raw = sessionStorage.getItem(key);
      const processed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      if (processed[state]) {
        if (debugLogs) {
          log.info(
            '[Better Auth Tauri] Skipping duplicate deep link for state',
            state
          );
        }
        return false;
      }
      // Track state for a short window (10 minutes)
      processed[state] = Date.now();
      // Prune old entries
      const tenMinutes = 10 * 60 * 1000;
      for (const [k, t] of Object.entries(processed)) {
        if (Date.now() - t > tenMinutes) {
          delete processed[k];
        }
      }
      sessionStorage.setItem(key, JSON.stringify(processed));
    } catch (e) {
      if (debugLogs) {
        log.error('[Better Auth Tauri] Failed to update processed states', e);
      }
    }
  }

  if (
    !(
      url.startsWith(`${scheme}:/${basePath}`) ||
      newUrl.pathname.startsWith(basePath)
    )
  ) {
    return false;
  }

  const href = `/${
    newUrl.protocol.startsWith('http')
      ? url.replace(newUrl.origin, '').replace(basePath, '')
      : url.replace(`${scheme}:/${basePath}`, '')
  }`;

  if (debugLogs) {
    log.info('[Better Auth Tauri] handleAuthDeepLink fetch', href);
  }

  onRequest?.(href);
  const response = await authClient.$fetch(href);

  if (debugLogs) {
    log.info('[Better Auth Tauri] handleAuthDeepLink response', response, href);
  }

  if (response.error?.message || response.error?.statusText) {
    if (debugLogs) {
      log.error(
        '[Better Auth Tauri] handleAuthDeepLink error',
        response.error,
        href
      );
    }

    onError?.(response.error);
  } else {
    // Some servers return an HTML document (success page or error page).
    // Treat obvious error pages as failures to avoid false-positive success.
    if (typeof response.data === 'string') {
      const dataStr = response.data.trim().toLowerCase();
      const looksHtml =
        dataStr.startsWith('<!doctype') || dataStr.startsWith('<html');
      const looksError =
        dataStr.includes('invalid_code') ||
        dataStr.includes('invalid state') ||
        dataStr.includes('oauth error') ||
        dataStr.includes('oauth_error');

      if (looksHtml && looksError) {
        const err: FetchError = {
          status: 400,
          statusText: 'Invalid OAuth callback',
          message: dataStr.includes('invalid_code')
            ? 'You are being rate limited. Please try again later.'
            : 'Authentication failed. Please try again later.',
        };
        if (debugLogs) {
          log.error(
            '[Better Auth Tauri] Detected HTML error in callback response'
          );
        }
        onError?.(err);
        return true;
      }
    }

    const searchParams = new URL(url).searchParams;
    const callbackURL = searchParams
      .get('callbackURL')
      ?.replace(`${scheme}:/`, '');

    if (debugLogs) {
      log.info(
        '[Better Auth Tauri] handleAuthDeepLink onSuccess callbackURL',
        callbackURL,
        href
      );
    }

    onSuccess?.(callbackURL);
  }

  return true;
}
