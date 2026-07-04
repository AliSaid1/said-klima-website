/**
 * Content page collection API route.
 *
 * Lists legal/CMS pages (Rechtstexte) from Supabase for administration.
 * Uses the admin client so all `rechtstexte` rows are visible regardless of
 * published state.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/content
 *
 * Publicly callable listing endpoint used by the admin panel to fetch all
 * legal/CMS pages (Rechtstexte). Reads all rows from the Supabase
 * `rechtstexte` table ordered by title.
 *
 * Returns `200` with `{ data }`, or `500` with the Supabase error message when
 * the query fails.
 *
 * Side effects: none; reads only `rechtstexte`.
 *
 * @returns A NextResponse containing content pages or an error.
 */
// GET /api/content — List all content pages (admin panel uses this; service_role bypasses RLS
// so all rechtstexte are returned regardless of veröffentlicht status)
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('rechtstexte')
    .select('*')
    .order('titel', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
