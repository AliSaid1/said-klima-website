/**
 * Builds Supabase SSR clients for Next.js Server Components and server actions.
 * The client reads and writes auth cookies through next/headers so Supabase
 * sessions remain synchronized with middleware-managed authentication state.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a request-scoped Supabase server client backed by Next.js cookies.
 * Cookie writes can be ignored in Server Components because middleware refreshes
 * sessions and route handlers can persist cookie changes through responses.
 *
 * @returns A Supabase SSR client configured with public URL and anon key.
 * @throws If required public Supabase environment variables are missing.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
