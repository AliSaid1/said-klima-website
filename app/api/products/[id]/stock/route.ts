import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/products/[id]/stock
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lagerbestaende')
    .select('*')
    .eq('artikel_id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Lagerbestand nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PUT /api/products/[id]/stock — Update stock
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

  if (body.bestand !== undefined) updates.bestand = body.bestand;
  if (body.mindestbestand !== undefined) updates.mindestbestand = body.mindestbestand;

  // Check if record exists
  const { data: existing } = await supabase
    .from('lagerbestaende')
    .select('id')
    .eq('artikel_id', id)
    .single();

  if (!existing) {
    // Create
    const { data, error } = await supabase
      .from('lagerbestaende')
      .insert({ artikel_id: id, ...updates })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Update
  const { data, error } = await supabase
    .from('lagerbestaende')
    .update(updates)
    .eq('artikel_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

