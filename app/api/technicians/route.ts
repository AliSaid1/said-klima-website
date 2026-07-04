/**
 * Technician API route for techniker (technicians). It lists technicians for
 * booking flows and lets administrators create, update, or delete technician
 * records and default availability.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Lists technicians.
 * GET /api/technicians.
 *
 * Auth: public for active techniker through RLS; admin users, determined from
 * `benutzer.rolle`, can read all technicians through the service-role client.
 *
 * Request shape: no body or query parameters are read.
 *
 * Response: `200` with `{ data }`; `500` when Supabase cannot read technicians.
 *
 * Side effects: none.
 *
 * @returns A NextResponse containing technician rows ordered by last name.
 */
// GET /api/technicians
// - Admin → all technicians incl. inactive (service_role bypasses RLS)
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

  const { data, error } = await db.from('techniker').select('*').order('nachname');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * Creates a technician and default weekday availability.
 * POST /api/technicians.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request body: techniker (technician) fields accepted by Supabase.
 *
 * Response: `201` with `{ data }`; `401`/`403` from the admin guard; `500` for
 * Supabase insert failures.
 *
 * Side effects: inserts a `techniker` row and, on success, inserts Monday-Friday
 * 08:00-17:00 rows into `techniker_verfuegbarkeit`.
 *
 * @param request - The incoming NextRequest carrying technician fields.
 * @returns A NextResponse containing the created technician row.
 */
// POST /api/technicians — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const { data, error } = await admin.from('techniker').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create default availability (Mo-Fr 08:00-17:00)
  if (data?.id) {
    const defaultAvailability = [1, 2, 3, 4, 5].map((wochentag) => ({
      techniker_id: data.id,
      wochentag,
      start_zeit: '08:00',
      ende_zeit: '17:00',
      verfuegbar: true,
    }));
    await admin.from('techniker_verfuegbarkeit').insert(defaultAvailability);
  }
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Updates a technician.
 * PUT /api/technicians.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request body: `{ id, ...updates }`; `id` is required.
 *
 * Response: `200` with `{ data }`; `400` when `id` is missing; `401`/`403` from
 * the admin guard; `500` for Supabase update failures.
 *
 * Side effects: updates a `techniker` row.
 *
 * @param request - The incoming NextRequest carrying technician update fields.
 * @returns A NextResponse containing the updated technician row.
 */
// PUT /api/technicians — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  const { data, error } = await admin.from('techniker').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * Deletes a technician.
 * DELETE /api/technicians.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Query params: required `id` identifies the techniker (technician).
 *
 * Response: `200` with `{ success: true }`; `400` when `id` is missing;
 * `401`/`403` from the admin guard; `500` for Supabase delete failures.
 *
 * Side effects: deletes the `techniker` row.
 *
 * @param request - The incoming NextRequest containing the technician `id` query parameter.
 * @returns A NextResponse confirming deletion or describing the error.
 */
// DELETE /api/technicians?id=...  — admin only
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  const { error } = await admin.from('techniker').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
