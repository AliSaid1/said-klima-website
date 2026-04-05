/**
 * Shared authentication & authorisation helpers for API routes.
 *
 * Usage:
 *   import { requireAdmin, requireAuth } from '@/lib/auth-guard';
 *
 *   const { user, error } = await requireAdmin();
 *   if (error) return error; // already a NextResponse
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthResult =
  | { user: { id: string; email?: string }; isAdmin: boolean; error: null }
  | { user: null; isAdmin: false; error: NextResponse };

/** Require the caller to be authenticated. Returns 401 if not. */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      isAdmin: false,
      error: NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
    };
  }
  return { user, isAdmin: false, error: null };
}

/** Require the caller to be authenticated AND have the admin role. Returns 401/403 if not. */
export async function requireAdmin(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      isAdmin: false,
      error: NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }),
    };
  }

  const adminClient = createAdminClient();
  const { data: benutzer } = await adminClient
    .from('benutzer')
    .select('rolle')
    .eq('id', user.id)
    .single();

  if (benutzer?.rolle !== 'admin') {
    return {
      user: null,
      isAdmin: false,
      error: NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 }),
    };
  }

  return { user, isAdmin: true, error: null };
}

