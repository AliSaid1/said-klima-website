import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
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
    '/admin/:path*',
    '/account/:path*',
    '/auth/:path*',
    '/',
  ],
};
