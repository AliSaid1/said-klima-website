/**
 * Product stock API route for lagerbestaende (stock) rows associated with an
 * artikel (product). It supports public stock reads and admin stock upserts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * Reads stock for one product.
 * GET /api/products/[id]/stock.
 *
 * Auth: public through the Supabase session/anon client; RLS controls access.
 *
 * Route params: `id` is the artikel (product) ID used as `artikel_id`.
 *
 * Response: `200` with `{ data }`; `404` when no stock row is found.
 *
 * Side effects: none.
 *
 * @param request - The incoming NextRequest.
 * @param context - Route context containing the promised product `id`.
 * @returns A NextResponse containing stock data or a not-found error.
 */
// GET /api/products/[id]/stock — public read (anon client, RLS allows public select)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lagerbestaende')
    .select('*')
    .eq('artikel_id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Lagerbestand nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * Updates or creates stock for one product.
 * PUT /api/products/[id]/stock.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Route params: `id` is the artikel (product) ID. Request body may include
 * `bestand` and/or `mindestbestand`.
 *
 * Response: `200` with `{ data }`; `401`/`403` from the admin guard; `500` when
 * Supabase insert/update fails.
 *
 * Side effects: updates an existing `lagerbestaende` row or inserts one for the
 * product when absent.
 *
 * @param request - The incoming NextRequest carrying stock update fields.
 * @param context - Route context containing the promised product `id`.
 * @returns A NextResponse containing the stock row or an error.
 */
// PUT /api/products/[id]/stock — admin only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.bestand !== undefined) updates.bestand = body.bestand;
  if (body.mindestbestand !== undefined) updates.mindestbestand = body.mindestbestand;

  const { data: existing } = await admin
    .from('lagerbestaende')
    .select('id')
    .eq('artikel_id', id)
    .single();

  if (!existing) {
    const { data, error } = await admin
      .from('lagerbestaende')
      .insert({ artikel_id: id, ...updates })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data, error } = await admin
    .from('lagerbestaende')
    .update(updates)
    .eq('artikel_id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
