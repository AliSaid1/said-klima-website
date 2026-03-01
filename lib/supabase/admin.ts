import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Use ONLY in:
// - API route handlers (webhooks, cron jobs)
// - Server-side seed scripts
// NEVER import this in client components or expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

