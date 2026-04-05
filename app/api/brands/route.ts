import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiDbError } from '@/lib/api-response';

// GET /api/brands — public read via admin client (brands are public catalog data)
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('marken')
    .select('*')
    .order('name', { ascending: true });
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

// POST /api/brands — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });

  const { data, error } = await admin
    .from('marken')
    .insert({ name: body.name })
    .select()
    .single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/brands — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  if (!body.id || !body.name) return NextResponse.json({ error: 'ID und Name erforderlich' }, { status: 400 });

  const { data, error } = await admin
    .from('marken')
    .update({ name: body.name })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

// DELETE /api/brands — admin only
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  // Check if brand is used by products
  const { count } = await admin
    .from('artikel')
    .select('*', { count: 'exact', head: true })
    .eq('marke_id', id);
  if (count && count > 0) {
    return NextResponse.json({ error: `Marke wird von ${count} Produkt(en) verwendet` }, { status: 400 });
  }

  const { error } = await admin.from('marken').delete().eq('id', id);
  if (error) return apiDbError(error);
  return NextResponse.json({ success: true });
}
