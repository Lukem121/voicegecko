import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionCookie } from "@acme/auth/utils";

import { APP_ROUTES } from "~/utils/app-routes";

const unprotectedRoutes: string[] = [
  // Auth
  APP_ROUTES.AUTH.SIGN_IN,
  APP_ROUTES.AUTH.SIGN_UP,
  APP_ROUTES.AUTH.FORGOT_PASSWORD,
  APP_ROUTES.AUTH.RESET_PASSWORD,
  APP_ROUTES.AUTH.VERIFY_EMAIL,
  APP_ROUTES.AUTH.ERROR,

  // Legal
  APP_ROUTES.LEGAL.TERMS,
  APP_ROUTES.LEGAL.PRIVACY,
];

/**
 * Add CORS headers for cross-origin requests (simple permissive config)
 */
const addCorsHeaders = (response: NextResponse, request: NextRequest) => {
  const origin = request.headers.get("origin");

  // Allow any origin
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  // Allow everything
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "*");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie, X-Requested-With, platform, x-trpc-source, trpc-accept, x-trpc-accept",
  );

  return response;
};

/**
 * Middleware for the app.
 *
 * Handles CORS for all routes and basic auth protection for pages.
 *
 * @param request - The request object.
 * @returns The response object.
 */
export default function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const origin = request.headers.get("origin");
  const isCrossOrigin = origin && origin !== new URL(request.url).origin;

  // Handle preflight OPTIONS requests for CORS
  if (request.method === "OPTIONS" && isCrossOrigin) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response, request);
  }

  // For API routes, just add CORS headers and continue
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return isCrossOrigin ? addCorsHeaders(response, request) : response;
  }

  // For page routes, handle auth + CORS
  const sessionCookie = getSessionCookie(request);
  const isUnprotectedRoute = unprotectedRoutes.some(
    (route) => pathname === route,
  );

  if (!sessionCookie && !isUnprotectedRoute) {
    console.log("🚨👇 blocked in middleware 👇🚨");
    console.log(pathname);
    console.log("🚨👆 blocked in middleware 👆🚨");

    const redirectResponse = NextResponse.redirect(
      new URL(APP_ROUTES.AUTH.SIGN_IN, request.url),
    );

    // Add CORS headers even to redirects for cross-origin requests
    return isCrossOrigin
      ? addCorsHeaders(redirectResponse, request)
      : redirectResponse;
  }

  const response = NextResponse.next();

  // Add CORS headers for cross-origin requests
  return isCrossOrigin ? addCorsHeaders(response, request) : response;
}

export const config = {
  matcher: [
    // Include API routes and all page routes
    // Exclude only static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|ingest/static|ingest/decide|ingest|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
