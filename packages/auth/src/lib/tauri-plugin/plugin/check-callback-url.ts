import { log } from '@acme/observability/log';
import type { MiddlewareContext, MiddlewareOptions } from 'better-auth';
import type { AuthContext } from 'better-auth/types';

export function checkCallbackURL({
  ctx,
  debugLogs,
  scheme,
  successURL,
  url,
}: {
  ctx: MiddlewareContext<MiddlewareOptions, AuthContext>;
  debugLogs?: boolean;
  scheme: string;
  successURL?: string;
  url: URL;
}) {
  if (!ctx.request) {
    return;
  }

  const userAgent = ctx.request.headers.get('user-agent');
  if (userAgent?.includes('Tauri/') || userAgent?.includes('tauri')) {
    return;
  }

  // If not Tauri user agent then check callbackURL for deep link redirects
  const searchParams = url.searchParams;
  const isDesktopRequest = searchParams.get('fromDesktop') === '1';
  if (isDesktopRequest) {
    // Desktop deep-link flow – don't modify redirect for web
    return;
  }
  // If this request originates from our desktop deep-link follow-up, skip redirect
  // to allow the server to process the OAuth code and set cookies.
  if (searchParams.get('fromDesktop') === '1') {
    if (debugLogs) {
      log.info(
        '[Better Auth Tauri] fromDesktop flag detected, skipping redirect'
      );
    }
    return;
  }
  const callbackURL = searchParams.get('callbackURL');

  if (debugLogs) {
    log.info('[Better Auth Tauri] Callback URL:', callbackURL, url.pathname);
  }

  if (!callbackURL?.startsWith(`${scheme}://`)) {
    return;
  }

  // Remove the Deep Link URL scheme from the callbackURL
  searchParams.set('callbackURL', callbackURL.replace(`${scheme}:/`, ''));
  // Mark that the desktop app is the consumer of this deep link to prevent re-redirects
  searchParams.set('fromDesktop', '1');

  const deepLinkURL = `${scheme}:/${url.pathname}?${searchParams.toString()}`;

  if (debugLogs) {
    log.info('[Better Auth Tauri] Redirecting to:', deepLinkURL, url.pathname);
  }

  throw ctx.redirect(
    successURL
      ? `${successURL}?tauriRedirect=${encodeURIComponent(deepLinkURL)}`
      : `${ctx.context.baseURL}/tauri/redirect?tauriRedirect=${encodeURIComponent(deepLinkURL)}`
  );
}
