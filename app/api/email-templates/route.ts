import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiServerError } from '@/lib/api-response';
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize';

const MAX_BETREFF_LEN  = 500;
const MAX_INHALT_LEN   = 100_000; // 100 KB — generous but bounded

// GET /api/email-templates — admin only
export async function GET() {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('email_vorlagen')
    .select('*')
    .order('typ', { ascending: true });

  if (error) return apiServerError(error.message);
  return NextResponse.json({ data });
}

// PUT /api/email-templates — admin only, sanitize + length-limit all fields
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const body = await request.json();
  const { id, betreff, inhalt_html } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (betreff !== undefined) {
    const clean = sanitizeText(String(betreff), MAX_BETREFF_LEN);
    if (!clean) return NextResponse.json({ error: 'Betreff darf nicht leer sein' }, { status: 400 });
    updates.betreff = clean;
  }

  if (inhalt_html !== undefined) {
    const raw = String(inhalt_html).slice(0, MAX_INHALT_LEN);
    updates.inhalt_html = sanitizeHtml(raw);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('email_vorlagen')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return apiServerError(error.message);
  return NextResponse.json({ data });
}
