import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { createAuthMiddleware } from 'better-auth/plugins';

import { isObjectWithBody } from '../utils/is-object-with-body';

const _discordAdapter = new DiscordAdapter();

type BannedUserError = {
  code: 'BANNED_USER';
  message: string;
};
function isBannedUserError(value: unknown): value is BannedUserError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    value.code === 'BANNED_USER' &&
    typeof value.message === 'string'
  );
}

export const handleAfterHook = createAuthMiddleware(async (ctx) => {
  await Promise.resolve();
  if (ctx.path.startsWith('/callback')) {
    const returned = ctx.context.returned;
    if (!ctx.request?.url) {
      return;
    }
    const url = new URL(ctx.request.url);
    const fromDesktop = url.searchParams.get('fromDesktop') === '1';

    // Banned user case: redirect on web; JSON error on desktop deep link
    if (
      returned &&
      isObjectWithBody(returned) &&
      isBannedUserError(returned.body)
    ) {
      if (fromDesktop) {
        return new Response(
          JSON.stringify({
            data: null,
            error: {
              status: 403,
              statusText: 'Forbidden',
              message: returned.body.message,
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw ctx.redirect('/authentication-error?error=USER_BANNED');
    }

    // Provider error (e.g., rate limit) -> return JSON for desktop
    if (fromDesktop && returned && isObjectWithBody(returned)) {
      const body: unknown = returned.body as unknown;
      const error_description =
        typeof body === 'object' && body && 'error_description' in body
          ? String((body as Record<string, unknown>).error_description ?? '')
          : '';
      if (error_description) {
        const lower = error_description.toLowerCase();
        const isRateLimited = lower.includes('rate limited');
        const status = isRateLimited ? 429 : 400;
        const statusText = isRateLimited ? 'Too Many Requests' : 'Bad Request';
        const message = isRateLimited
          ? 'You are being rate limited. Please try again later.'
          : error_description;
        return new Response(
          JSON.stringify({
            data: null,
            error: { status, statusText, message },
          }),
          { status, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }
});
