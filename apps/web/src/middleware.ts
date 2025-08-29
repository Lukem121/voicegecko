import { getSessionCookie } from '@acme/auth/utils/get-session-cookie';
import { log } from '@acme/observability/log';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { APP_ROUTES } from '~/utils/app-routes';

const unprotectedRoutes: string[] = [
  APP_ROUTES.HOME,
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
  APP_ROUTES.LEGAL.SECURITY_POLICY,

  // Marketing
  APP_ROUTES.MARKETING.PRICING,
  APP_ROUTES.MARKETING.DOWNLOAD,
  APP_ROUTES.MARKETING.DOWNLOAD_SUCCESS,
  APP_ROUTES.MARKETING.CONTACT,
  APP_ROUTES.MARKETING.CONTACT_SUCCESS,

  '/opengraph-image',
  '/redirect-deeplink',
];

export default function middleware(request: NextRequest) {
  log.info('🔍 Middleware request:', request.url);

  const pathname = new URL(request.url).pathname;

  // Skip API routes - they have their own auth handling
  if (pathname.startsWith('/api/') || pathname.startsWith('/assets/')) {
    return NextResponse.next();
  }

  // For page routes, handle auth
  const sessionCookie = getSessionCookie(request);
  const isUnprotectedRoute = unprotectedRoutes.some(
    (route) => pathname === route
  );

  if (!(sessionCookie || isUnprotectedRoute)) {
    log.info('🚨 Blocked in middleware:', pathname);

    // Preserve the original URL the user was trying to access
    const signInUrl = new URL(APP_ROUTES.AUTH.SIGN_IN, request.url);
    signInUrl.searchParams.set('redirect', request.url);

    // Add intent context for better user experience
    signInUrl.searchParams.set('intent_type', 'auth');
    signInUrl.searchParams.set('intent_source', 'middleware');

    return NextResponse.redirect(signInUrl);
  }

  if (sessionCookie && pathname === APP_ROUTES.AUTH.SIGN_IN) {
    // Check if there's a redirect parameter for authenticated users
    const redirectParam = request.nextUrl.searchParams.get('redirect');

    if (redirectParam) {
      try {
        const redirectUrl = new URL(redirectParam);
        // Validate that the redirect URL is safe (same origin)
        if (redirectUrl.origin === request.nextUrl.origin) {
          log.info('🔄 Redirecting authenticated user to:', redirectParam);
          return NextResponse.redirect(redirectUrl);
        }
      } catch {
        log.warn('⚠️ Invalid redirect parameter:', redirectParam);
      }
    }

    // Default redirect for authenticated users on sign-in page
    return NextResponse.redirect(new URL(APP_ROUTES.APP.ROOT, request.url));
  }

  return NextResponse.next();
}

// Include API routes and all page routes
// Exclude only static assets and Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|ingest/static|ingest/decide|ingest|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
