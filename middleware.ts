import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Helper to extract the best available IP identifier from the request
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Auth-sensitive paths: max 5 requests per 15 minutes per IP
const AUTH_PATHS = [
  '/account/login',
  '/account/register',
  '/account/passwort-vergessen',
  '/account/passwort-neu',
  '/admin/login',
  '/api/bookings',    // POST creates a booking — limited to prevent spam
];
const AUTH_MAX = 5;
const AUTH_WINDOW = 15 * 60; // 15 minutes

// Checkout path: more permissive — customers legitimately retry checkout
const CHECKOUT_PATHS = ['/api/checkout'];
const CHECKOUT_MAX = 20;
const CHECKOUT_WINDOW = 60 * 60; // 1 hour

export async function middleware(request: NextRequest) {
  const ip = getClientIp(request);
  const { pathname } = request.nextUrl;

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const isAuthPath     = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isCheckoutPath = CHECKOUT_PATHS.some((p) => pathname.startsWith(p));
  const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  if (isMutationMethod) {
    if (isAuthPath) {
      const rl = await rateLimit(`rl:auth:${ip}:${pathname}`, AUTH_MAX, AUTH_WINDOW);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Zu viele Anfragen. Bitte warten Sie, bevor Sie es erneut versuchen.' },
          { status: 429, headers: rateLimitHeaders(rl) },
        );
      }
    } else if (isCheckoutPath) {
      const rl = await rateLimit(`rl:checkout:${ip}`, CHECKOUT_MAX, CHECKOUT_WINDOW);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut.' },
          { status: 429, headers: rateLimitHeaders(rl) },
        );
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // If there's a `code` query param (from Supabase PKCE auth flow),
  // redirect to the auth callback handler to exchange it for a session
  const code = request.nextUrl.searchParams.get('code');
  const isCallbackRoute = request.nextUrl.pathname.startsWith('/auth/callback');

  if (code && !isCallbackRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.searchParams.set('next', request.nextUrl.pathname || '/account');
    return NextResponse.redirect(url);
  }

  // If there's a `token_hash` and `type` param (from Supabase email verification link),
  // redirect to the auth callback to verify the token
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (tokenHash && type && !isCallbackRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.searchParams.set('next', '/account');
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run middleware on admin routes, account routes, auth routes, and root (for ?code= handling)
    // Include the admin root explicitly in addition to subpaths so the
    // admin guard runs consistently for `/admin` and `/admin/*`.
    '/admin',
    '/admin/:path*',
    // Ensure the login page also runs through middleware so we can
    // handle redirects (e.g. redirect logged-in admins away from /admin/login)
    '/admin/login',
    '/account/:path*',
    '/auth/:path*',
    '/api/bookings',
    '/api/bookings/:path*',
    '/api/checkout',
    '/api/checkout/:path*',
    '/',
  ],
};
