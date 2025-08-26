/** biome-ignore-all lint/style/noNonNullAssertion: non-null assertion is required */

import { log } from '@acme/observability/log';
import type { MiddlewareContext, MiddlewareOptions } from 'better-auth';
import type { SocialProviders } from 'better-auth/social-providers';
import type { AuthContext } from 'better-auth/types';

export function appendCallbackURL({
  callbackURL,
  ctx,
  debugLogs,
  scheme,
}: {
  callbackURL: string;
  ctx: MiddlewareContext<MiddlewareOptions, AuthContext>;
  debugLogs?: boolean;
  scheme: string;
}) {
  if (!ctx.request) {
    return;
  }
  if (!ctx.context.options.socialProviders) {
    return;
  }
  const url = new URL(ctx.request.url);
  const isSignInSocial = ctx.path === '/sign-in/social';
  const isCallbackPath = ctx.path.startsWith('/callback/');
  const platformHeader = ctx.request.headers.get('platform') || '';
  const isDesktopRequest =
    (platformHeader && !['android', 'ios'].includes(platformHeader)) ||
    url.searchParams.get('fromDesktop') === '1';
  if (!(isSignInSocial || isCallbackPath)) {
    return;
  }

  // no-op: platformHeader already read above

  for (const key of Object.keys(ctx.context.options.socialProviders)) {
    if (isSignInSocial) {
      if (isDesktopRequest) {
        const redirect = `${ctx.context.baseURL}/callback/${key}?callbackURL=${scheme}:/${callbackURL}`;
        if (debugLogs) {
          log.info(
            '[Better Auth Tauri] Appending callback URL to social provider (sign-in)',
            key,
            redirect
          );
        }
        ctx.context.options.socialProviders![
          key as keyof SocialProviders
        ]!.redirectURI = redirect;
      } else {
        if (debugLogs) {
          log.info(
            '[Better Auth Tauri] Removing callback URL from social provider (sign-in)',
            key
          );
        }
        ctx.context.options.socialProviders![
          key as keyof SocialProviders
        ]!.redirectURI = undefined;
      }
    } else if (isCallbackPath) {
      // Only adjust redirectURI on callback for desktop deep-link flows
      if (!isDesktopRequest) {
        if (debugLogs) {
          log.info(
            '[Better Auth Tauri] Web callback detected, not modifying redirect URI',
            key
          );
        }
        continue;
      }
      const cbParam = url.searchParams.get('callbackURL') ?? callbackURL;
      const effectiveCb = `${scheme}:/${cbParam}`;
      const redirect = `${ctx.context.baseURL}/callback/${key}?callbackURL=${effectiveCb}`;
      if (debugLogs) {
        log.info(
          '[Better Auth Tauri] Ensuring callback redirect URI matches (callback)',
          key,
          redirect
        );
      }
      ctx.context.options.socialProviders![
        key as keyof SocialProviders
      ]!.redirectURI = redirect;
    }
  }
}
