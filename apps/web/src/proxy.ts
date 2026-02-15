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

  // Lightweight server-side first-touch attribution cookie (optional)
  try {
    const url = request.nextUrl;
    const params = url.searchParams;
    const hasAttributionCookie = request.cookies.has('vg_attrib_initial');
    const hasParams =
      params.has('ref') ||
      params.has('utm_source') ||
      params.has('utm_medium') ||
      params.has('utm_campaign') ||
      params.has('utm_content') ||
      params.has('utm_term') ||
      params.has('gclid') ||
      params.has('wbraid') ||
      params.has('gbraid');

    if (!hasAttributionCookie && hasParams) {
      const referrer = request.headers.get('referer');
      const payload = {
        ref: params.get('ref'),
        utm_source: params.get('utm_source') || (params.get('ref') ? `ref:${params.get('ref')}` : null),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_content: params.get('utm_content'),
        utm_term: params.get('utm_term'),
        gclid: params.get('gclid'),
        wbraid: params.get('wbraid'),
        gbraid: params.get('gbraid'),
        referrer,
        landing_page: url.pathname + url.search,
        timestamp: new Date().toISOString(),
      };

      const response = NextResponse.next();
      response.cookies.set('vg_attrib_initial', JSON.stringify(payload), {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 180, // 180 days
      });
      return response;
    }
  } catch {
    // ignore attribution cookie errors
  }

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
