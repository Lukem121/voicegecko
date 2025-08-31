/** biome-ignore-all lint/suspicious/useAwait: needed for tauri */

import { log } from '@acme/observability/log';
import type { BetterAuthPlugin } from 'better-auth';
import { getSessionFromCtx } from 'better-auth/api';
import { createAuthMiddleware } from 'better-auth/plugins';
import { appendCallbackURL } from './append-callback-url';
import { claimEndpoint } from './claim-endpoint';
import { redirectEndpoint } from './redirect-endpoint';

export const tauri = ({
  callbackURL = '/',
  debugLogs,
  scheme,
  successText = 'Your authentication was successful. You may now close this window and return to the application.',
  successURL,
}: {
  baseURL?: string;
  callbackURL?: string;
  debugLogs?: boolean;
  scheme: string;
  successText?: string;
  successURL?: string;
}) =>
  ({
    id: 'tauriPlugin',
    hooks: {
      before: [
        {
          matcher: (context) => {
            const url = context.request?.url ?? '';
            if (url.includes('/reset-password')) {
              return false;
            }
            if (url.includes('/tauri/redirect')) {
              return false;
            }
            return true;
          },
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.request) {
              return;
            }

            // Always use /api/auth as basePath when redirecting to Tauri
            const basePath = ctx.context.options.basePath ?? '/api/auth';
            const url = new URL(ctx.request.url);
            url.pathname = url.pathname.replace(basePath, '/api/auth');

            if (debugLogs) {
              const userAgent = ctx.request.headers.get('user-agent');
              const host = ctx.request.headers.get('host');

              log.info(
                '[Better Auth Tauri] Request URL:',
                ctx.request.url,
                'User Agent:',
                userAgent,
                'Host:',
                host,
                'Pathname:',
                url.pathname
              );
            }

            appendCallbackURL({
              callbackURL,
              ctx,
              debugLogs,
              scheme,
            });

            // Defer any deep-link redirects to after-hook to ensure browser cookies are set first
          }),
        },
      ],
      after: [
        {
          matcher: (context) =>
            Boolean(
              context.request?.url?.includes('/callback/') ||
                context.request?.url?.includes('/verify-email')
            ),
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.request) {
              return;
            }
            const url = new URL(ctx.request.url);
            const searchParams = url.searchParams;
            const callbackURLParam = searchParams.get('callbackURL');
            if (!callbackURLParam?.startsWith(`${scheme}://`)) {
              return;
            }
            // Prepare deep link and httpURL for browser-first completion
            const sp = new URLSearchParams(searchParams);
            const plainCallback = callbackURLParam.replace(`${scheme}:/`, '');
            sp.set('callbackURL', plainCallback);
            sp.set('fromDesktop', '1');

            // Generate a short-lived one-time bridge token bound to the authenticated user
            let userId =
              ctx.context.newSession?.user?.id ?? ctx.context.session?.user?.id;
            if (!userId) {
              try {
                const s = await getSessionFromCtx(ctx);
                userId = s?.user?.id;
              } catch {
                // ignore
              }
            }
            if (!userId) {
              if (debugLogs) {
                log.info(
                  '[Better Auth Tauri] After-hook: no user session found; skipping deep link'
                );
              }
              return;
            }

            const token = `tauri-bridge-${Math.random()
              .toString(36)
              .slice(2, 10)}-${Date.now()}`;
            await ctx.context.internalAdapter.createVerificationValue({
              identifier: token,
              value: userId,
              expiresAt: new Date(Date.now() + 2 * 60 * 1000),
            });

            const deepLinkURL = `${scheme}:/api/auth/tauri/claim?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(plainCallback)}`;
            const httpURL = `${url.pathname}?${sp.toString()}`;

            if (debugLogs) {
              log.info(
                '[Better Auth Tauri] After-hook redirect to successURL with deep link',
                deepLinkURL
              );
            }

            throw ctx.redirect(
              successURL
                ? `${successURL}?tauriRedirect=${encodeURIComponent(deepLinkURL)}&httpURL=${encodeURIComponent(httpURL)}`
                : `${ctx.context.baseURL}/tauri/redirect?tauriRedirect=${encodeURIComponent(deepLinkURL)}`
            );
          }),
        },
      ],
    },
    endpoints: {
      getTauriRedirect: redirectEndpoint(successText),
      tauriClaim: claimEndpoint,
    },
  }) satisfies BetterAuthPlugin;
