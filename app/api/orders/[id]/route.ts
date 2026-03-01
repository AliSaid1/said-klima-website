import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/orders/[id]
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
    .from('bestellungen')
    .select(`
      *,
      benutzer(vorname, nachname, email, telefonnummer),
      bestellpositionen(id, typ, titel, artikelnummer, menge, preis_brutto, steuersatz)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PUT /api/orders/[id] — Update status or add note
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

  // Get existing order
  const { data: existing, error: fetchError } = await supabase
    .from('bestellungen')
    .select('notizen, status')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  // Update status
  if (body.status && body.status !== existing.status) {
    updates.status = body.status;
  }

  // Add note
  if (body.notiz) {
    const currentNotes = (existing.notizen as Array<Record<string, string>>) || [];
    updates.notizen = [
      ...currentNotes,
      {
        text: body.notiz.text,
        erstellt_am: new Date().toISOString(),
        autor: user.email || 'Admin',
      },
    ];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ data: existing });
  }

  const { data, error } = await supabase
    .from('bestellungen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

