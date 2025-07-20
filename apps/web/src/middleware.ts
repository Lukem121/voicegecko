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

  console.log("CORS Debug:", {
    origin,
    url: request.url,
    method: request.method,
    pathname: new URL(request.url).pathname,
  });

  // Allow any origin - for API routes we're being permissive
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
  response.headers.set("Access-Control-Max-Age", "86400");

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

  // For API routes, always add CORS headers if there's an origin header
  // This handles both same-site with different subdomains (www vs non-www) and truly cross-origin requests
  if (pathname.startsWith("/api/")) {
    // Handle preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 200 });
      return addCorsHeaders(response, request);
    }

    // For regular API requests, add CORS headers if origin is present
    const response = NextResponse.next();
    return origin ? addCorsHeaders(response, request) : response;
  }

  // For page routes, handle auth + CORS for cross-origin requests
  const isCrossOrigin = origin && origin !== new URL(request.url).origin;

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

  // Add CORS headers for cross-origin page requests
  return isCrossOrigin ? addCorsHeaders(response, request) : response;
}

// Include API routes and all page routes
// Exclude only static assets and Next.js internals
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|ingest/static|ingest/decide|ingest|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
