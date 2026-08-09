import { appRouter } from '@acme/api/src/root';
import { createTRPCContext } from '@acme/api/src/trpc';
import { serverAuth } from '@acme/auth';
import { log } from '@acme/observability/log';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';
import { resolveMinSupportedVersion } from '~/config/desktop-policy';

/**
 * Handle all tRPC requests (GET and POST)
 * CORS is handled by next.config.js
 */
const handler = async (request: NextRequest) => {
  // Enforce minimum client version if provided via config env
  const MIN_VERSION = resolveMinSupportedVersion(
    process.env.MIN_SUPPORTED_DESKTOP_VERSION
  );
  const CLIENT_VERSION = request.headers.get('x-client-version');
  if (MIN_VERSION && CLIENT_VERSION) {
    // compare semantic versions as fixed-length tuples to avoid undefined
    const toTuple = (v: string): [number, number, number] => {
      const s = v.startsWith('v') ? v.slice(1) : v;
      const parts = s.split('.').map((n) => Number.parseInt(n, 10));
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    };
    const a = toTuple(CLIENT_VERSION);
    const b = toTuple(MIN_VERSION);
    const older =
      a[0] < b[0] ||
      (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
    if (older) {
      return new Response('Upgrade required', { status: 426 });
    }
  }

  return await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: request.headers,
        auth: serverAuth,
      }),
    onError: ({ error, path }) => {
      log.error(error, `tRPC error on '${path}'`);
    },
  });
};

export { handler as GET, handler as POST };

/**
 * Handle OPTIONS preflight requests
 */
export function OPTIONS() {
  return new Response(null, { status: 200 });
}
