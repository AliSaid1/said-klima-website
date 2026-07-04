/**
 * Creates privileged Supabase clients for trusted server-only workflows.
 * The service-role key bypasses row-level security and is intended for API
 * routes, webhooks, cron jobs, and seed scripts that must never run in browsers.
 */
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Use ONLY in:
// - API route handlers (webhooks, cron jobs)
// - Server-side seed scripts
// NEVER import this in client components or expose to the browser.
/**
 * Creates a Supabase service-role client with session persistence disabled.
 *
 * @returns A Supabase client authenticated with SUPABASE_SERVICE_ROLE_KEY.
 * @throws If required Supabase environment variables are missing at runtime.
 */
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
