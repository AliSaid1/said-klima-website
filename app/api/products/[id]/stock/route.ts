import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guard';

// GET /api/products/[id]/stock — public read (anon client, RLS allows public select)
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

// PUT /api/products/[id]/stock — admin only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.bestand !== undefined) updates.bestand = body.bestand;
  if (body.mindestbestand !== undefined) updates.mindestbestand = body.mindestbestand;

  const { data: existing } = await admin
    .from('lagerbestaende')
    .select('id')
    .eq('artikel_id', id)
    .single();

  if (!existing) {
    const { data, error } = await admin
      .from('lagerbestaende')
      .insert({ artikel_id: id, ...updates })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data, error } = await admin
    .from('lagerbestaende')
    .update(updates)
    .eq('artikel_id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
