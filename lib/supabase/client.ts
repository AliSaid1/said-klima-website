'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Fail fast with a clear message in the browser console during development
    const msg = 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.';
    // eslint-disable-next-line no-console
    console.error('[supabase] ' + msg);
    throw new Error(msg);
  }

  return createBrowserClient(url, key);
}

