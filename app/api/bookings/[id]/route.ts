import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/bookings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('buchungen')
    .select(`
      *,
      dienstleistungen(id, code, name, dauer_minuten),
      techniker(id, vorname, nachname, telefon, email),
      benutzer(vorname, nachname, email, telefonnummer),
      benutzer_adressen(strasse, plz, ort, bundesland, land)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PUT /api/bookings/[id] — Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.geplant_von !== undefined) updates.geplant_von = body.geplant_von;
  if (body.geplant_bis !== undefined) updates.geplant_bis = body.geplant_bis;
  if (body.techniker_id !== undefined) updates.techniker_id = body.techniker_id;
  if (body.hinweise !== undefined) updates.hinweise = body.hinweise;

  const { data, error } = await supabase
    .from('buchungen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/bookings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { error } = await supabase
    .from('buchungen')
    .update({ status: 'abgesagt' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

