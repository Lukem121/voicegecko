import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from 'better-auth/plugins';

export const claimEndpoint = createAuthEndpoint(
  '/tauri/claim',
  {
    method: 'GET',
  },
  async (ctx) => {
    if (!ctx.request) {
      return;
    }

    const url = new URL(ctx.request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            status: 400,
            statusText: 'Bad Request',
            message: 'Missing token',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const verification =
      await ctx.context.internalAdapter.findVerificationValue(token);

    if (!verification || verification.expiresAt < new Date()) {
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            status: 400,
            statusText: 'Bad Request',
            message: 'Invalid or expired token',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = verification.value;
    const user = await ctx.context.internalAdapter.findUserById(userId);
    if (!user) {
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            status: 404,
            statusText: 'Not Found',
            message: 'User not found',
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await ctx.context.internalAdapter
      .createSession(user.id, ctx, false)
      .catch(() => {
        return null;
      });

    if (!session) {
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            status: 500,
            statusText: 'Internal Server Error',
            message: 'Failed to create session',
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await setSessionCookie(ctx, { session, user });

    // Single-use: delete verification token after successful claim
    await ctx.context.internalAdapter.deleteVerificationValue(verification.id);

    return new Response(
      JSON.stringify({ data: { success: true }, error: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
);
