import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/technicians
// - Admin → all technicians incl. inactive (service_role bypasses RLS)
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

  const { data, error } = await db.from('techniker').select('*').order('nachname');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/technicians — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const { data, error } = await admin.from('techniker').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create default availability (Mo-Fr 08:00-17:00)
  if (data?.id) {
    const defaultAvailability = [1, 2, 3, 4, 5].map((wochentag) => ({
      techniker_id: data.id,
      wochentag,
      start_zeit: '08:00',
      ende_zeit: '17:00',
      verfuegbar: true,
    }));
    await admin.from('techniker_verfuegbarkeit').insert(defaultAvailability);
  }
  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/technicians — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  const { data, error } = await admin.from('techniker').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE /api/technicians?id=...  — admin only
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

  const { error } = await admin.from('techniker').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
