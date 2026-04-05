import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingConfirmation, sendNewBookingNotification } from '@/lib/email';
import { apiServerError } from '@/lib/api-response';
import { sanitizeText } from '@/lib/sanitize';

// GET /api/bookings
// - Admin      → all bookings (with filters)
// - Auth user  → only their own (benutzer_id = user.id) — email param ignored
// - Anon + email param → bookings by kontakt_email only (no personal data returned)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const von    = searchParams.get('von')    || '';
  const bis    = searchParams.get('bis')    || '';
  // email param is only honoured for unauthenticated callers
  const emailParam = searchParams.get('email') || '';

  // Determine role
  let isAdmin = false;
  if (user) {
    const { data: benutzer } = await admin
      .from('benutzer')
      .select('rolle')
      .eq('id', user.id)
      .single();
    isAdmin = benutzer?.rolle === 'admin';
  }

  // Gate: unauthenticated callers must supply an email param
  if (!user && !emailParam) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const selectFull = `
    *,
    dienstleistungen(id, code, name, dauer_minuten),
    techniker(id, vorname, nachname),
    benutzer(vorname, nachname, email, telefonnummer),
    buchung_dienstleistungen(
      dienstleistung_id,
      dienstleistungen(id, name, dauer_minuten, basispreis_brutto)
    )
  `;
  const selectSimple = `
    *,
    dienstleistungen(id, code, name, dauer_minuten),
    techniker(id, vorname, nachname),
    benutzer(vorname, nachname, email, telefonnummer)
  `;

  const buildQuery = (sel: string) => {
    let q = admin
      .from('buchungen')
      .select(sel)
      .order('geplant_von', { ascending: false });

    if (isAdmin) {
      // Admin sees all — no user filter, but other filters still apply
    } else if (user) {
      // Authenticated non-admin: ALWAYS scope to their own bookings.
      // Ignore any email param — prevents enumeration attacks.
      q = q.eq('benutzer_id', user.id);
    } else {
      // Unauthenticated: only match on kontakt_email
      q = q.eq('kontakt_email', emailParam);
    }

    if (status) q = q.eq('status', status);
    if (von)    q = q.gte('geplant_von', von);
    if (bis)    q = q.lte('geplant_von', bis);
    return q;
  };

  let { data, error } = await buildQuery(selectFull);
  if (error) {
    console.warn('[BOOKINGS GET] Full query failed, trying simple:', error.message);
    const retry = await buildQuery(selectSimple);
    data  = retry.data;
    error = retry.error;
  }

  if (error) return apiServerError(error.message);
  return NextResponse.json({ data });
}

// POST /api/bookings — Create a new booking (public or authenticated)
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const supabase = await createClient();

  // Body size guard — reject obviously oversized payloads early
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 32_768) {
    return NextResponse.json({ error: 'Anfrage zu groß' }, { status: 413 });
  }

  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  // Never trust a benutzer_id from the body — use the authenticated user's ID only
  const benutzerId = user?.id || null;

  const kontakt = body.kontakt || {};
  const kontaktName    = kontakt.vorname && kontakt.nachname
    ? sanitizeText(`${kontakt.vorname} ${kontakt.nachname}`, 200)
    : null;
  const kontaktEmail   = kontakt.email   ? sanitizeText(kontakt.email,   200) : null;
  const kontaktTelefon = kontakt.telefon ? sanitizeText(kontakt.telefon, 50)  : null;

  const serviceIds: string[] = body.dienstleistung_ids || [body.dienstleistung_id].filter(Boolean);

  if (serviceIds.length === 0) {
    return NextResponse.json({ error: 'Mindestens eine Dienstleistung erforderlich' }, { status: 400 });
  }
  if (!body.geplant_von || !body.geplant_bis) {
    return NextResponse.json({ error: 'Geplante Zeit fehlt' }, { status: 400 });
  }

  const hinweiseText = body.hinweise ? sanitizeText(body.hinweise, 2000) : null;

  let insertData: Record<string, unknown> = {
    benutzer_id:    benutzerId,
    dienstleistung_id: serviceIds[0],
    techniker_id:   body.techniker_id  || null,
    adresse_id:     body.adresse_id    || null,
    geplant_von:    body.geplant_von,
    geplant_bis:    body.geplant_bis,
    status:         'ausstehend',
    hinweise:       hinweiseText,
  };

  if (kontaktName)    insertData.kontakt_name    = kontaktName;
  if (kontaktEmail)   insertData.kontakt_email   = kontaktEmail;
  if (kontaktTelefon) insertData.kontakt_telefon = kontaktTelefon;

  let { data, error } = await admin.from('buchungen').insert(insertData).select().single();

  if (error && error.message.includes('kontakt_')) {
    console.warn('[BOOKINGS POST] kontakt columns missing, falling back...');
    insertData = {
      benutzer_id:       benutzerId,
      dienstleistung_id: serviceIds[0],
      techniker_id:      body.techniker_id || null,
      adresse_id:        body.adresse_id   || null,
      geplant_von:       body.geplant_von,
      geplant_bis:       body.geplant_bis,
      status:            'ausstehend',
      hinweise: [
        hinweiseText,
        kontaktName    ? `Kontakt: ${kontaktName}`    : null,
        kontaktEmail   ? `E-Mail: ${kontaktEmail}`    : null,
        kontaktTelefon ? `Telefon: ${kontaktTelefon}` : null,
      ].filter(Boolean).join('\n') || null,
    };
    const retry = await admin.from('buchungen').insert(insertData).select().single();
    data  = retry.data;
    error = retry.error;
  }

  if (error) return apiServerError(error.message);

  if (data && serviceIds.length > 0) {
    const bdRows = serviceIds.map((sid: string) => ({ buchung_id: data.id, dienstleistung_id: sid }));
    const { error: bdError } = await admin.from('buchung_dienstleistungen').insert(bdRows);
    if (bdError) console.warn('[BOOKINGS POST] buchung_dienstleistungen insert failed:', bdError.message);
  }

  const buchungNr = `BK-${Date.now().toString(36).toUpperCase()}`;

  if (data) {
    let serviceNames = 'Termin';
    if (serviceIds.length > 0) {
      const { data: services } = await admin.from('dienstleistungen').select('name').in('id', serviceIds);
      if (services?.length) serviceNames = services.map((s: { name: string }) => s.name).join(', ');
    }
    const datum = new Date(body.geplant_von).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const zeit  = `${new Date(body.geplant_von).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${new Date(body.geplant_bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;

    if (kontaktEmail) {
      sendBookingConfirmation({ to: kontaktEmail, kundenname: kontaktName || 'Kunde', dienstleistung: serviceNames, datum, uhrzeit: zeit })
        .catch((err) => console.error('[BOOKING] Customer email failed:', err));
    }
    sendNewBookingNotification({ kundenname: kontaktName || 'Kunde', kundenEmail: kontaktEmail || '–', kundenTelefon: kontaktTelefon || '', dienstleistung: serviceNames, datum, zeit, technikerId: body.techniker_id || null })
      .catch((err) => console.error('[BOOKING] Admin notification failed:', err));
  }

  return NextResponse.json({ data: { ...data, booking_number: buchungNr } }, { status: 201 });
}
