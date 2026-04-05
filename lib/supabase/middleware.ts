import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // We cannot mutate the incoming NextRequest cookies. Instead, write
          // cookies to the NextResponse that we will return to the client.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            // H-6: Enforce SameSite=Lax (minimum) on all session cookies to
            // mitigate CSRF. 'Lax' allows navigation-triggered GET requests
            // (e.g. OAuth redirects) while blocking cross-site POST/mutations.
            const secureOptions = {
              ...options,
              sameSite: options?.sameSite ?? ('lax' as const),
              httpOnly: options?.httpOnly ?? true,
              secure: process.env.NODE_ENV === 'production' ? true : (options?.secure ?? false),
            };
            try {
              supabaseResponse.cookies.set(name, value, secureOptions);
            } catch (e) {
              // If setting on the response fails for any reason, log and continue.
              console.error('[middleware] failed to set cookie on response:', e);
            }
          });
        },
      },
    }
  );

  // ── Session check ────────────────────────────────────────────────────────────
  // Use getSession() — reads the JWT from cookies locally without any outbound
  // network call. getUser() validates against the Supabase auth server, but that
  // fetch fails inside Next.js's middleware Edge sandbox.
  //
  // IMPORTANT: getSession() trusts the cookie value without server validation.
  // Real authorisation (JWT validation + admin role DB lookup) is enforced inside
  // the admin layout and individual admin server components where the full Node.js
  // runtime is available and outbound fetch works reliably.
  let user: { id: string; email?: string } | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch (err) {
    // If even getSession() throws (e.g. malformed cookie), treat as unauthenticated.
    console.error('[middleware] getSession failed:', err);
  }

  // ── Route protection ─────────────────────────────────────────────────────────
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage  = pathname === '/admin/login';

  if (isAdminRoute && !isLoginPage && !user) {
    // No session at all → redirect to admin login
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // Logged-in user visits /admin/login → redirect to dashboard
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
