import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize';

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
