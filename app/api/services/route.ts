import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeText } from '@/lib/sanitize';
import { apiDbError } from '@/lib/api-response';

// GET /api/services
// - Admin  → all services incl. inactive (service_role bypasses RLS)
// - Public → only aktiv=true (anon key, RLS enforced)
export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: benutzer } = await admin.from('benutzer').select('rolle').eq('id', user.id).single();
    isAdmin = benutzer?.rolle === 'admin';
  }
  const db = isAdmin ? admin : supabase;

  const { data, error } = await db.from('dienstleistungen').select('*').order('name');
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

// POST /api/services — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  if (body.name) body.name = sanitizeText(body.name, 200);
  if (body.beschreibung) body.beschreibung = sanitizeText(body.beschreibung, 2000);

  const { data, error } = await admin.from('dienstleistungen').insert(body).select().single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/services — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  if (updates.name) updates.name = sanitizeText(updates.name, 200);
  if (updates.beschreibung) updates.beschreibung = sanitizeText(updates.beschreibung, 2000);

  const { data, error } = await admin
    .from('dienstleistungen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return apiDbError(error);
  return NextResponse.json({ data });
}

// DELETE /api/services — admin only (soft delete via aktiv=false)
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  const { error } = await admin.from('dienstleistungen').update({ aktiv: false }).eq('id', id);
  if (error) return apiDbError(error);
  return NextResponse.json({ success: true });
}
