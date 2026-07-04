/**
 * Admin email template API route for email_vorlagen (email templates). It lists
 * and updates sanitized template subjects and HTML bodies used by transactional
 * emails.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiServerError } from '@/lib/api-response';
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize';

const MAX_BETREFF_LEN  = 500;
const MAX_INHALT_LEN   = 100_000; // 100 KB — generous but bounded

/**
 * Lists all email templates.
 * GET /api/email-templates.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request shape: no body or query parameters are read.
 *
 * Response: `200` with `{ data }` ordered by template type; `401`/`403` from
 * the admin guard; `500` when Supabase cannot read `email_vorlagen`.
 *
 * Side effects: none.
 *
 * @returns A NextResponse containing email template rows.
 */
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

/**
 * Updates one email template's subject and/or HTML content.
 * PUT /api/email-templates.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request body: `{ id, betreff?, inhalt_html? }`; `id` is required. `betreff`
 * is text-sanitized and length-limited, while `inhalt_html` is truncated and
 * HTML-sanitized.
 *
 * Response: `200` with `{ data }`; `400` for missing ID, empty sanitized
 * subject, or no updatable fields; `401`/`403` from the admin guard; `500` for
 * Supabase update failures.
 *
 * Side effects: updates `email_vorlagen`.
 *
 * @param request - The incoming NextRequest carrying the update JSON body.
 * @returns A NextResponse containing the updated template row.
 */
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
