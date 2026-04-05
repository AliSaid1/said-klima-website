import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guard';
import { updateArtikelSchema } from '@/lib/validators/artikel';
import { slugify } from '@/lib/slugify';
import { apiDbError, apiError } from '@/lib/api-response';

// UUID v4 guard — prevents malformed IDs reaching Supabase (avoids cryptic 22P02 errors)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Bug fix #3: validate UUID before hitting the DB
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ungültige Produkt-ID' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('artikel')
    .select(`
      *,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand, mindestbestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(id, speicherpfad, mime_type)),
      artikel_technische_daten(id, inhalt, anzeige_reihenfolge)
    `)
    .eq('id', id)
    .single();

  if (error) {
    // Bug fix #4: PGRST116 = no row found → 404; anything else → 500
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 });
    }
    return apiDbError(error);
  }

  return NextResponse.json({ data });
}

// PUT /api/products/[id] — admin only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Bug fix #3: validate UUID
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ungültige Produkt-ID' }, { status: 400 });
  }

  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();

  // Bug fix B: guard against malformed JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Inhalt' }, { status: 400 });
  }

  const parsed = updateArtikelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.format() }, { status: 400 });
  }

  // Extract fields that don't go directly onto the artikel row
  const { bilder, technische_daten_rte, ...artikelData } = parsed.data;

  // ── Clean nullable FK fields ─────────────────────────────────────────────────
  const cleanData = { ...artikelData };
  if (!cleanData.marke_id)     cleanData.marke_id     = null;
  if (!cleanData.kategorie_id) cleanData.kategorie_id = null;

  // ── Slug generation ───────────────────────────────────────────────────────────
  if (cleanData.titel && !cleanData.slug) {
    cleanData.slug = slugify(cleanData.titel as string);
  }

  // ── Update artikel row with retry-on-slug-conflict ────────────────────────────
  // ONLY retries when the slug unique constraint fires (artikel_slug_key).
  // Other unique violations (e.g., duplicate Artikelnummer) fail immediately.
  if (cleanData.slug) {
    const MAX_SLUG_RETRIES = 10;
    const baseSlug = cleanData.slug as string;
    let candidate = baseSlug;
    let slugUpdated = false;

    for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
      const { error: updateError } = await admin
        .from('artikel')
        .update({ ...cleanData, slug: candidate })
        .eq('id', id);

      if (!updateError) {
        cleanData.slug = candidate;
        slugUpdated = true;
        break;
      }

      const isSlugConflict =
        updateError.code === '23505' &&
        (
          (updateError.message ?? '').includes('artikel_slug_key') ||
          (updateError.details  ?? '').includes('artikel_slug_key')
        );

      if (isSlugConflict) {
        // Bug fix D: was `attempt + 1` after incrementing, skipping "-1".
        // Now we use the current attempt value directly: -1, -2, -3 …
        candidate = `${baseSlug}-${attempt + 1}`;
        continue;
      }

      return apiDbError(updateError);
    }

    // Bug fix #1: all retries exhausted → must fail, not silently fall through
    if (!slugUpdated) {
      return apiError(
        `Der URL-Pfad "${baseSlug}" ist bereits zu oft vergeben. Bitte wählen Sie einen anderen Slug.`,
        409,
      );
    }
  } else if (Object.keys(cleanData).length > 0) {
    const { error: updateError } = await admin
      .from('artikel')
      .update(cleanData)
      .eq('id', id);
    if (updateError) return apiDbError(updateError);
  }

  // ── Update technical data rich text (replace single row) ─────────────────────
  if (technische_daten_rte !== undefined) {
    const { error: delErr } = await admin
      .from('artikel_technische_daten')
      .delete()
      .eq('artikel_id', id);
    // Bug fix #5: surface delete errors instead of silently proceeding
    if (delErr) return apiDbError(delErr);

    if (technische_daten_rte) {
      const { error: insErr } = await admin.from('artikel_technische_daten').insert({
        artikel_id: id,
        inhalt: technische_daten_rte,
        anzeige_reihenfolge: 0,
      });
      if (insErr) return apiDbError(insErr);
    }
  }

  // ── Update images (replace all) ───────────────────────────────────────────────
  if (bilder !== undefined) {
    const { error: delErr } = await admin
      .from('artikel_bilder')
      .delete()
      .eq('artikel_id', id);
    // Bug fix #5: if delete fails, don't lose images silently
    if (delErr) return apiDbError(delErr);

    if (bilder.length > 0) {
      const { error: insErr } = await admin.from('artikel_bilder').insert(
        bilder.map((img) => ({
          artikel_id: id,
          datei_id: img.datei_id || null,
          alt_text: img.alt_text || null,
          anzeige_reihenfolge: img.anzeige_reihenfolge,
        }))
      );
      if (insErr) return apiDbError(insErr);
    }
  }

  // ── Update stock (upsert) ─────────────────────────────────────────────────────
  // Bug fix #6: read bestand/mindestbestand from raw body but guard with typeof check
  // so strings/booleans are rejected and never reach the DB.
  const rawBody      = body as Record<string, unknown>;
  const rawBestand   = typeof rawBody.bestand       === 'number' ? rawBody.bestand       : undefined;
  const rawMindest   = typeof rawBody.mindestbestand === 'number' ? rawBody.mindestbestand : undefined;

  if (rawBestand !== undefined || rawMindest !== undefined) {
    const stockUpdate: Record<string, number> = {};
    if (rawBestand !== undefined) stockUpdate.bestand       = rawBestand;
    if (rawMindest !== undefined) stockUpdate.mindestbestand = rawMindest;

    // Bug fix C: also capture the error from the existence check — a DB failure
    // here would previously be silently ignored, causing a spurious INSERT instead of UPDATE.
    const { data: existing, error: stockLookupErr } = await admin
      .from('lagerbestaende')
      .select('id')
      .eq('artikel_id', id)
      .single();

    if (stockLookupErr && stockLookupErr.code !== 'PGRST116') {
      return apiDbError(stockLookupErr);
    }

    if (existing) {
      const { error: stockErr } = await admin
        .from('lagerbestaende')
        .update(stockUpdate)
        .eq('artikel_id', id);
      if (stockErr) return apiDbError(stockErr);
    } else {
      const { error: stockErr } = await admin.from('lagerbestaende').insert({
        artikel_id: id,
        bestand:        rawBestand ?? 0,
        mindestbestand: rawMindest ?? 2,
      });
      if (stockErr) return apiDbError(stockErr);
    }
  }

  // ── Return the updated product ────────────────────────────────────────────────
  const { data, error: fetchErr } = await admin
    .from('artikel')
    .select(`
      *,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand, mindestbestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge),
      artikel_technische_daten(id, inhalt, anzeige_reihenfolge)
    `)
    .eq('id', id)
    .single();

  if (fetchErr) return apiDbError(fetchErr);
  return NextResponse.json({ data });
}

// DELETE /api/products/[id] — admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Bug fix #3: validate UUID
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ungültige Produkt-ID' }, { status: 400 });
  }

  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();

  // ── 1. Nullify bestellpositionen.artikel_id (FK has no CASCADE, column nullable)
  const { error: bpErr } = await admin
    .from('bestellpositionen')
    .update({ artikel_id: null })
    .eq('artikel_id', id);
  // Bug fix #2: pass full error object, not just .message
  if (bpErr) return apiDbError(bpErr);

  // ── 2. Delete lagerbestaende (FK without CASCADE) ────────────────────────────
  const { error: lbErr } = await admin
    .from('lagerbestaende')
    .delete()
    .eq('artikel_id', id);
  if (lbErr) return apiDbError(lbErr);

  // ── 3. Delete artikel row — artikel_bilder + artikel_technische_daten CASCADE
  const { error } = await admin.from('artikel').delete().eq('id', id);
  if (error) return apiDbError(error);

  return NextResponse.json({ success: true });
}

