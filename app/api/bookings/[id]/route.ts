import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingStatusEmail } from '@/lib/email';

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
