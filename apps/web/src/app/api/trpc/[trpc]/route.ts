import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@acme/api/src/root";
import { createTRPCContext } from "@acme/api/src/trpc";
import { serverAuth } from "@acme/auth";

/**
 * Handle all tRPC requests (GET and POST)
 * CORS is handled by middleware
 */
const handler = async (request: NextRequest) => {
  return await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: request.headers,
        auth: serverAuth,
      }),
    onError: ({ error, path }) => {
      console.error(`❌ tRPC Error on '${path}':`, error);
    },
  });
};

export { handler as GET, handler as POST };
