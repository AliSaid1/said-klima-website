/**
 * Brand (Marke) API routes for catalog administration.
 *
 * Lists public brand catalog data and provides admin-only creation, update, and
 * deletion of Supabase `marken` rows. Delete checks the `artikel` (product)
 * table before removing a brand.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiDbError } from '@/lib/api-response';

/**
 * GET /api/brands
 *
 * Public endpoint that lists all brands (Marken) ordered by name.
 *
 * Returns `200` with `{ data }` from `marken`, or an error response from
 * `apiDbError` when the Supabase query fails.
 *
 * Side effects: none; reads only `marken`.
 *
 * @returns A NextResponse containing brands or a database error.
 */
// GET /api/brands — public read via admin client (brands are public catalog data)
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('marken')
    .select('*')
    .order('name', { ascending: true });
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

/**
 * POST /api/brands
 *
 * Admin-only endpoint that creates a brand (Marke). Reads JSON body field
 * `name`.
 *
 * Returns `201` with `{ data }` for the inserted `marken` row. Returns `400`
 * when `name` is missing, `401`/`403` from `requireAdmin` for unauthorized
 * callers, and a database error response from `apiDbError` for Supabase
 * failures.
 *
 * Side effects: inserts one row into `marken`.
 *
 * @param request - The incoming NextRequest containing the brand JSON body.
 * @returns A NextResponse with the created brand or an error.
 */
// POST /api/brands — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });

  const { data, error } = await admin
    .from('marken')
    .insert({ name: body.name })
    .select()
    .single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * PUT /api/brands
 *
 * Admin-only endpoint that updates a brand (Marke). Reads JSON body fields
 * `id` and `name`.
 *
 * Returns `200` with `{ data }` for the updated `marken` row. Returns `400`
 * when `id` or `name` is missing, `401`/`403` from `requireAdmin`, and a
 * database error response from `apiDbError` for Supabase failures.
 *
 * Side effects: updates one row in `marken`.
 *
 * @param request - The incoming NextRequest containing the brand update JSON body.
 * @returns A NextResponse with the updated brand or an error.
 */
// PUT /api/brands — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  if (!body.id || !body.name) return NextResponse.json({ error: 'ID und Name erforderlich' }, { status: 400 });

  const { data, error } = await admin
    .from('marken')
    .update({ name: body.name })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

/**
 * DELETE /api/brands
 *
 * Admin-only endpoint that deletes a brand (Marke). Reads query param `id`.
 * Before deleting, checks whether any product (Artikel) rows in `artikel`
 * still reference the brand.
 *
 * Returns `200` with `{ success: true }`. Returns `400` when `id` is missing
 * or the brand is still used by products, `401`/`403` from `requireAdmin`, and
 * a database error response from `apiDbError` for Supabase delete failures.
 *
 * Side effects: reads `artikel` for reference counts and deletes from `marken`.
 *
 * @param request - The incoming NextRequest containing the brand ID query parameter.
 * @returns A NextResponse confirming deletion or describing an error.
 */
// DELETE /api/brands — admin only
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  // Check if brand is used by products
  const { count } = await admin
    .from('artikel')
    .select('*', { count: 'exact', head: true })
    .eq('marke_id', id);
  if (count && count > 0) {
    return NextResponse.json({ error: `Marke wird von ${count} Produkt(en) verwendet` }, { status: 400 });
  }

  const { error } = await admin.from('marken').delete().eq('id', id);
  if (error) return apiDbError(error);
  return NextResponse.json({ success: true });
}
