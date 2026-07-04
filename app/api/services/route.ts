/**
 * Services API route for dienstleistungen (services). It lists public/admin
 * service catalog entries and lets admins create, update, or soft-delete them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeText } from '@/lib/sanitize';
import { apiDbError } from '@/lib/api-response';

/**
 * Lists services.
 * GET /api/services.
 *
 * Auth: public for active dienstleistungen through RLS; admin users, determined
 * from `benutzer.rolle`, can read all services through the service-role client.
 *
 * Request shape: no body or query parameters are read.
 *
 * Response: `200` with `{ data }`; `500` for Supabase read failures.
 *
 * Side effects: none.
 *
 * @returns A NextResponse containing service rows ordered by name.
 */
// GET /api/services
// - Admin  → all services incl. inactive (service_role bypasses RLS)
// - Public → only aktiv=true (anon key, RLS enforced)
export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: benutzer } = await admin.from('benutzer').select('rolle').eq('id', user.id).single();
    isAdmin = benutzer?.rolle === 'admin';
  }
  const db = isAdmin ? admin : supabase;

  const { data, error } = await db.from('dienstleistungen').select('*').order('name');
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

/**
 * Creates a service.
 * POST /api/services.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request body: service fields for `dienstleistungen`; optional `name` and
 * `beschreibung` are text-sanitized before insert.
 *
 * Response: `201` with `{ data }`; `401`/`403` from the admin guard; `500` for
 * Supabase insert failures.
 *
 * Side effects: inserts a `dienstleistungen` row.
 *
 * @param request - The incoming NextRequest carrying the service JSON body.
 * @returns A NextResponse containing the created service row.
 */
// POST /api/services — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  if (body.name) body.name = sanitizeText(body.name, 200);
  if (body.beschreibung) body.beschreibung = sanitizeText(body.beschreibung, 2000);

  const { data, error } = await admin.from('dienstleistungen').insert(body).select().single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Updates a service.
 * PUT /api/services.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request body: `{ id, ...updates }`; `id` is required. Optional `name` and
 * `beschreibung` are text-sanitized before update.
 *
 * Response: `200` with `{ data }`; `400` when `id` is missing; `401`/`403` from
 * the admin guard; `500` for Supabase update failures.
 *
 * Side effects: updates a `dienstleistungen` row.
 *
 * @param request - The incoming NextRequest carrying service update fields.
 * @returns A NextResponse containing the updated service row.
 */
// PUT /api/services — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  if (updates.name) updates.name = sanitizeText(updates.name, 200);
  if (updates.beschreibung) updates.beschreibung = sanitizeText(updates.beschreibung, 2000);

  const { data, error } = await admin
    .from('dienstleistungen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

/**
 * Soft-deletes a service.
 * DELETE /api/services.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Query params: `id` is required and identifies the dienstleistung (service).
 *
 * Response: `200` with `{ success: true }`; `400` when `id` is missing;
 * `401`/`403` from the admin guard; `500` for Supabase update failures.
 *
 * Side effects: sets `dienstleistungen.aktiv` to `false`.
 *
 * @param request - The incoming NextRequest containing the service `id` query parameter.
 * @returns A NextResponse confirming the soft delete or describing the error.
 */
// DELETE /api/services — admin only (soft delete via aktiv=false)
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  const { error } = await admin.from('dienstleistungen').update({ aktiv: false }).eq('id', id);
  if (error) return apiDbError(error);
  return NextResponse.json({ success: true });
}
