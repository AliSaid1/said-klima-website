/**
 * Blocked booking dates (gesperrte_tage) API routes.
 *
 * Lists and manages dates that should be excluded from booking availability,
 * optionally globally or for a specific technician. Touches the Supabase
 * `gesperrte_tage` table and reads related `techniker` data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/blocked-dates
 *
 * Public endpoint that lists blocked booking dates (gesperrte_tage), including
 * technician names when the block is technician-specific.
 *
 * Returns `200` with `{ data }` ordered by date, or `500` when Supabase returns
 * a query error.
 *
 * Side effects: none; this route only reads `gesperrte_tage` and `techniker`.
 *
 * @returns A NextResponse containing blocked dates or an error.
 */
// GET /api/blocked-dates
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gesperrte_tage')
    .select('*, techniker(vorname, nachname)')
    .order('datum', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * POST /api/blocked-dates
 *
 * Authenticated-user endpoint that creates a blocked booking date. Reads JSON
 * body fields `datum` (date), optional `grund` (reason), and optional
 * `techniker_id` for technician-specific blocking.
 *
 * Returns `201` with `{ data }` for the inserted `gesperrte_tage` row.
 * Returns `401` for anonymous callers and `500` for Supabase insert errors.
 *
 * Side effects: inserts a row into `gesperrte_tage`.
 *
 * @param request - The incoming NextRequest containing the blocked-date JSON body.
 * @returns A NextResponse with the created blocked date or an error.
 */
// POST /api/blocked-dates
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('gesperrte_tage')
    .insert({
      datum: body.datum,
      grund: body.grund || null,
      techniker_id: body.techniker_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * DELETE /api/blocked-dates
 *
 * Authenticated-user endpoint that deletes a blocked booking date. Reads query
 * param `id` for the `gesperrte_tage` row to remove.
 *
 * Returns `200` with `{ success: true }`. Returns `400` when `id` is missing,
 * `401` for anonymous callers, and `500` for Supabase delete errors.
 *
 * Side effects: deletes one row from `gesperrte_tage`.
 *
 * @param request - The incoming NextRequest containing the blocked-date ID query parameter.
 * @returns A NextResponse confirming deletion or describing an error.
 */
// DELETE /api/blocked-dates
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  const { error } = await supabase.from('gesperrte_tage').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
