import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";

// Configuration constants
const ALLOWED_ORIGINS = [
  "http://localhost:1420", // Tauri desktop app
  "http://localhost:3000", // Next.js web app
] as const;

const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "Cookie",
  "x-trpc-source",
  "trpc-accept",
  "x-trpc-accept",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "user-agent",
] as const;

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as const;

/**
 * Configure CORS headers for cookie-based authentication.
 * Specific origin required when using credentials.
 */
const setCorsHeaders = (
  response: Response,
  request?: NextRequest,
): Response => {
  const origin = request?.headers.get("origin");

  // Set origin if it's in our allowed list
  if (
    origin &&
    ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number])
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  // Set essential CORS headers
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    ALLOWED_METHODS.join(", "),
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    ALLOWED_HEADERS.join(", "),
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
};

/**
 * Handle preflight OPTIONS requests
 */
export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  console.log(`🔄 CORS preflight request from: ${origin}`);

  const response = new Response(null, { status: 200 });
  return setCorsHeaders(response, request);
}

/**
 * Handle all tRPC requests (GET and POST)
 */
const handler = async (request: NextRequest) => {
  const origin = request.headers.get("origin");
  console.log(`📡 tRPC request from: ${origin}`);

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: request.headers,
        auth,
      }),
    onError: ({ error, path }) => {
      console.error(`❌ tRPC Error on '${path}':`, error);
    },
  });

  return setCorsHeaders(response, request);
};

export { handler as GET, handler as POST };
