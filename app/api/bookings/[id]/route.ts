/**
 * Booking (Buchung) detail API routes.
 *
 * Reads, updates, and soft-cancels individual bookings in the Supabase
 * `buchungen` table, with related `dienstleistungen` (services), `techniker`,
 * and `benutzer` data. Status changes can trigger booking email notifications.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingStatusEmail } from '@/lib/email';

/**
 * GET /api/bookings/[id]
 *
 * Authenticated-user endpoint that fetches one booking (Buchung) by route param
 * `id`, including related service (Dienstleistung), technician, and user
 * (Benutzer) details.
 *
 * Returns `200` with `{ data }`. Returns `401` for anonymous callers and `404`
 * when the booking cannot be found.
 *
 * Side effects: none; reads from `buchungen`, `dienstleistungen`, `techniker`,
 * and `benutzer`.
 *
 * @param request - The incoming NextRequest.
 * @param context - Route context containing the booking ID parameter.
 * @returns A NextResponse containing the booking or an error.
 */
// GET /api/bookings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { data, error } = await admin
    .from('buchungen')
    .select(`
      *,
      dienstleistungen(id, code, name, dauer_minuten),
      techniker(id, vorname, nachname),
      benutzer(vorname, nachname, email, telefonnummer)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * PUT /api/bookings/[id]
 *
 * Admin-only endpoint that updates one booking (Buchung). Reads route param
 * `id` and JSON body fields `status`, `geplant_von`, `geplant_bis`,
 * `techniker_id`, and `hinweise`. Valid statuses are `ausstehend`,
 * `bestaetigt`, `abgeschlossen`, `abgesagt`, and `nicht_erschienen`.
 *
 * Returns `200` with `{ data }` for the updated row. Returns `400` for an
 * invalid status, `401` for anonymous callers, `403` for non-admin users,
 * `404` when the booking does not exist, and `500` for Supabase update errors.
 *
 * Side effects: reads `benutzer` to verify admin role, reads the current
 * booking, updates `buchungen`, sets `aktualisiert_am`, and asynchronously
 * sends a customer status email through `lib/email` when the status changes.
 *
 * @param request - The incoming NextRequest containing the booking update JSON body.
 * @param context - Route context containing the booking ID parameter.
 * @returns A NextResponse with the updated booking or an error.
 */
// PUT /api/bookings/[id] — Update booking (admin: status change + email notifications)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // Check admin role
  const { data: benutzer } = await admin
    .from('benutzer')
    .select('rolle')
    .eq('id', user.id)
    .single();

  if (benutzer?.rolle !== 'admin') {
    return NextResponse.json({ error: 'Nur Admins können Buchungen verwalten' }, { status: 403 });
  }

  const body = await request.json();
  const { status: newStatus } = body;

  const validStatuses = ['ausstehend', 'bestaetigt', 'abgeschlossen', 'abgesagt', 'nicht_erschienen'];
  if (newStatus && !validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
  }

  // Fetch current booking before update (to compare old/new status)
  const { data: oldBooking } = await admin
    .from('buchungen')
    .select(`
      *,
      dienstleistungen(id, name),
      techniker(id, vorname, nachname),
      benutzer(vorname, nachname, email)
    `)
    .eq('id', id)
    .single();

  if (!oldBooking) {
    return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 });
  }

  // Build update
  const updates: Record<string, unknown> = {
    aktualisiert_am: new Date().toISOString(),
  };
  if (body.status !== undefined) updates.status = body.status;
  if (body.geplant_von !== undefined) updates.geplant_von = body.geplant_von;
  if (body.geplant_bis !== undefined) updates.geplant_bis = body.geplant_bis;
  if (body.techniker_id !== undefined) updates.techniker_id = body.techniker_id;
  if (body.hinweise !== undefined) updates.hinweise = body.hinweise;

  const { data, error } = await admin
    .from('buchungen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send email notification on status change ──
  if (newStatus && newStatus !== oldBooking.status) {
    const kundenEmail = oldBooking.benutzer?.email || oldBooking.kontakt_email;
    const kundenName = oldBooking.benutzer
      ? `${oldBooking.benutzer.vorname} ${oldBooking.benutzer.nachname}`
      : (oldBooking.kontakt_name || 'Kunde');
    const dienstleistung = oldBooking.dienstleistungen?.name || 'Termin';
    const datum = new Date(oldBooking.geplant_von).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const zeit = `${new Date(oldBooking.geplant_von).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${new Date(oldBooking.geplant_bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;

    if (kundenEmail) {
      sendBookingStatusEmail({
        to: kundenEmail,
        kundenname: kundenName,
        dienstleistung,
        datum,
        zeit,
        neuerStatus: newStatus,
      }).catch((err) => console.error('[BOOKING EMAIL] Customer notification failed:', err));
    }
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/bookings/[id]
 *
 * Authenticated-user endpoint that soft-cancels a booking (Buchung) by setting
 * its status to `abgesagt`. Reads route param `id`.
 *
 * Returns `200` with `{ success: true }`. Returns `401` for anonymous callers
 * and `500` for Supabase update errors.
 *
 * Side effects: updates `buchungen.status` and `buchungen.aktualisiert_am`.
 *
 * @param request - The incoming NextRequest.
 * @param context - Route context containing the booking ID parameter.
 * @returns A NextResponse confirming cancellation or describing an error.
 */
// DELETE /api/bookings/[id] — Cancel booking (soft-delete: set status to abgesagt)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { error } = await admin
    .from('buchungen')
    .update({ status: 'abgesagt', aktualisiert_am: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
