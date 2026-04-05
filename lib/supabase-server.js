import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using the service role key.
// This client uses HTTPS and will work even when direct Postgres TCP is unreachable
// (for example on IPv6-restricted networks).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables')
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
})

export default supabaseAdmin

