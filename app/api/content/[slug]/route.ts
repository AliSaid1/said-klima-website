/**
 * Content page detail API routes.
 *
 * Reads public legal/CMS pages (Rechtstexte) by slug and provides admin-only
 * updates with version history. Touches Supabase `rechtstexte`,
 * `inhalt_versionen`, and `benutzer` tables.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize';

/**
 * GET /api/content/[slug]
 *
 * Public endpoint that fetches one legal/CMS page (Rechtstext) by route param
 * `slug` and returns recent version history from `inhalt_versionen`.
 *
 * Returns `200` with `{ data, versions }`, where `data.published` normalizes
 * the German `veröffentlicht` column for clients. Returns `404` when the page
 * is not found.
 *
 * Side effects: none; reads `rechtstexte` and up to 20 `inhalt_versionen` rows.
 *
 * @param request - The incoming NextRequest.
 * @param context - Route context containing the content slug parameter.
 * @returns A NextResponse containing the content page, versions, or an error.
 */
// GET /api/content/[slug] — Get content page + version history (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rechtstexte')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Seite nicht gefunden' }, { status: 404 });
  }

  // Fetch version history
  const { data: versions } = await supabase
    .from('inhalt_versionen')
    .select('*')
    .eq('rechtstext_id', data.id)
    .order('version_nummer', { ascending: false })
    .limit(20);

  const normalized = { ...data, published: (data as any)['veröffentlicht'] };
  return NextResponse.json({ data: normalized, versions: versions || [] });
}

/**
 * PUT /api/content/[slug]
 *
 * Admin-only endpoint that updates one legal/CMS page (Rechtstext). Reads route
 * param `slug` and JSON body fields `titel`, `content_html`, `published`, or
 * `veröffentlicht`. HTML and text fields are sanitized before storage.
 *
 * Returns `200` with `{ data }`, including normalized `published`. Returns
 * `401` for anonymous callers, `403` for non-admin users, `404` when the page
 * is not found, and `500` for Supabase update errors.
 *
 * Side effects: verifies admin role via `benutzer`, optionally inserts a
 * version snapshot into `inhalt_versionen`, updates `rechtstexte`, and sets
 * `aktualisiert_am`.
 *
 * @param request - The incoming NextRequest containing the content update JSON body.
 * @param context - Route context containing the content slug parameter.
 * @returns A NextResponse with the updated content page or an error.
 */
// PUT /api/content/[slug] — Update content page (admin only, creates version)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // Verify admin role
  const adminClient = createAdminClient();
  const { data: benutzer } = await adminClient
    .from('benutzer')
    .select('rolle')
    .eq('id', user.id)
    .single();
  if (benutzer?.rolle !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const body = await request.json();

  // Sanitize HTML and text before storing
  if (body.content_html !== undefined) {
    body.content_html = sanitizeHtml(String(body.content_html));
  }
  if (body.titel !== undefined) {
    body.titel = sanitizeText(String(body.titel), 300);
  }

  // Get existing page
  const { data: existing, error: fetchError } = await supabase
    .from('rechtstexte')
    .select('*')
    .eq('slug', slug)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Seite nicht gefunden' }, { status: 404 });
  }

  // Create version of current content before updating
  if (existing.content_html) {
    const { data: lastVersion } = await supabase
      .from('inhalt_versionen')
      .select('version_nummer')
      .eq('rechtstext_id', existing.id)
      .order('version_nummer', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_nummer || 0) + 1;

    await supabase.from('inhalt_versionen').insert({
      rechtstext_id: existing.id,
      content_html: existing.content_html,
      version_nummer: nextVersion,
      erstellt_von: user.id,
    });
  }

  // Update page
  const updates: Record<string, unknown> = {};
  if (body.titel !== undefined) updates.titel = body.titel;
  if (body.content_html !== undefined) updates.content_html = body.content_html;
  // Accept a portable 'published' property from clients and map it to the
  // DB column named 'veröffentlicht'. This avoids non-ASCII property names
  // across the client-server boundary.
  if (body.published !== undefined) updates['veröffentlicht'] = body.published;
  else if (body['veröffentlicht'] !== undefined) updates['veröffentlicht'] = body['veröffentlicht'];

  // Ensure the aktualisiert_am column is set to now() when saving from the admin
  // This guarantees the timestamp updates even if the DB trigger is missing.
  updates.aktualisiert_am = new Date().toISOString();

  const { data, error } = await supabase
    .from('rechtstexte')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalize response: include 'published' for client-friendly access
  const normalized = { ...data, published: (data as any)['veröffentlicht'] };
  return NextResponse.json({ data: normalized });
}
