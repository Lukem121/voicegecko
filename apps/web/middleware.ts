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
 * Middleware for the app.
 *
 * Basic auth to protect routes except sign in/up ect.
 *
 * @param request - The request object.
 * @returns The response object.
 */
export default function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = new URL(request.url).pathname;

  const isUnprotectedRoute = unprotectedRoutes.some(
    (route) => pathname === route,
  );

  if (!sessionCookie && !isUnprotectedRoute) {
    console.log("🚨👇 blocked in middleware 👇🚨");
    console.log(pathname);
    console.log("🚨👆 blocked in middleware 👆🚨");
    return NextResponse.redirect(new URL(APP_ROUTES.AUTH.SIGN_IN, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // This regex pattern determines which requests the middleware will process
    // It INCLUDES all routes EXCEPT:
    // - /api/* routes (API endpoints)
    // - /_next/static/* (Next.js static assets)
    // - /_next/image/* (Next.js optimized images)
    // - /favicon.ico, /sitemap.xml, /robots.txt (common root files)
    // - Any file with common web extensions (.html, .css, .js, .jpg, .png, etc.)
    // - /ingest/static/* (PostHog static assets)
    // - /ingest/* (PostHog data ingestion)
    // - /ingest/decide (PostHog feature flags)
    // - /monitoring (health checks)
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|ingest/static|ingest/decide|ingest|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
