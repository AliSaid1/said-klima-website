import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/bookings — List bookings with filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const von = searchParams.get('von') || '';
  const bis = searchParams.get('bis') || '';

  let query = supabase
    .from('buchungen')
    .select(`
      *,
      dienstleistungen(id, code, name, dauer_minuten),
      techniker(id, vorname, nachname),
      benutzer(vorname, nachname, email, telefonnummer)
    `)
    .order('geplant_von', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }
  if (von) {
    query = query.gte('geplant_von', von);
  }
  if (bis) {
    query = query.lte('geplant_von', bis);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/bookings — Create a new booking (public)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // Generate booking number
  const buchungNr = `BK-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from('buchungen')
    .insert({
      benutzer_id: body.benutzer_id || null,
      dienstleistung_id: body.dienstleistung_id,
      techniker_id: body.techniker_id || null,
      adresse_id: body.adresse_id || null,
      geplant_von: body.geplant_von,
      geplant_bis: body.geplant_bis,
      status: 'ausstehend',
      hinweise: body.hinweise || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...data, booking_number: buchungNr } }, { status: 201 });
}

