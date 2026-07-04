/**
 * Product management API route for artikel (products). It lists public/admin
 * product data and creates products with related lagerbestaende (stock),
 * artikel_bilder (product images), and artikel_technische_daten (technical
 * data).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createArtikelSchema } from '@/lib/validators/artikel';
import { slugify } from '@/lib/slugify';
import { requireAdmin } from '@/lib/auth-guard';
import { apiDbError, apiServerError } from '@/lib/api-response';

/**
 * Lists products with filters and pagination.
 * GET /api/products.
 *
 * Auth: public for active artikel through the anon/session client; admin users,
 * determined from `benutzer.rolle`, can view inactive products via the
 * service-role client.
 *
 * Query params: `page`, `limit`, `search`, `kategorie`, `status`, `marke`,
 * `sortBy`, and `sortOrder`.
 *
 * Response: `200` with `{ data, pagination }`; `500` when Supabase cannot read
 * artikel and related rows.
 *
 * Side effects: none.
 *
 * @param request - The incoming NextRequest containing filter, sort, and pagination query parameters.
 * @returns A NextResponse containing product rows and pagination metadata.
 */
// GET /api/products
// - Admin (service_role client): sees ALL products incl. inactive — bypasses RLS
// - Public/anon (anon client): only aktiv=true — RLS enforced
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  // Detect admin so the admin panel can see inactive products
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: benutzer } = await admin
      .from('benutzer').select('rolle').eq('id', user.id).single();
    isAdmin = benutzer?.rolle === 'admin';
  }
  const db = isAdmin ? admin : supabase;

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const search = searchParams.get('search') || '';
  const kategorie = searchParams.get('kategorie') || '';
  const status = searchParams.get('status') || '';
  const marke = searchParams.get('marke') || '';
  const sortBy = searchParams.get('sortBy') || 'erstellt_am';
  const sortOrder = searchParams.get('sortOrder') === 'asc';

  const ALLOWED_SORT = ['erstellt_am', 'titel', 'preis_brutto', 'artikelnummer'];
  const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'erstellt_am';

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .from('artikel')
    .select(`
      *,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand, mindestbestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(speicherpfad)),
      artikel_technische_daten(id, inhalt, anzeige_reihenfolge)
    `, { count: 'exact' });

  if (search) query = query.or(`titel.ilike.%${search}%,artikelnummer.ilike.%${search}%`);
  if (kategorie) query = query.eq('kategorie_id', kategorie);
  if (status === 'aktiv') query = query.eq('aktiv', true);
  if (status === 'inaktiv') query = query.eq('aktiv', false);
  if (marke) query = query.eq('marke_id', marke);

  query = query.order(safeSort, { ascending: sortOrder }).range(from, to);

  const { data, count, error } = await query;
  if (error) return apiServerError(error.message);

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
}

/**
 * Creates a product and its related stock, technical-data, and image rows.
 * POST /api/products.
 *
 * Auth: admin via `requireAdmin`.
 *
 * Request body: validated by `createArtikelSchema`; may include product fields,
 * `bilder`, `technische_daten_rte`, and raw `bestand`/`mindestbestand`.
 *
 * Response: `201` with `{ data }`; `400` for schema validation failures;
 * `401`/`403` from the admin guard; `409` for translated unique conflicts such
 * as slug or article-number collisions; `500` for other Supabase errors.
 *
 * Side effects: inserts `artikel`, `lagerbestaende`, optional
 * `artikel_technische_daten`, and optional `artikel_bilder`; auto-generates or
 * retries slugs when necessary.
 *
 * @param request - The incoming NextRequest carrying the product JSON body.
 * @returns A NextResponse containing the created product row.
 */
// POST /api/products — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();
  const body = await request.json();
  const parsed = createArtikelSchema.safeParse(body);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const messages = [
      ...flat.formErrors,
      ...Object.entries(flat.fieldErrors).map(([f, errs]) => `${f}: ${(errs as string[]).join(', ')}`),
    ].join('; ');
    return NextResponse.json({ error: messages || 'Validierungsfehler' }, { status: 400 });
  }

  // Extract fields that don't go directly onto the artikel row
  const { bilder, technische_daten_rte, ...artikelData } = parsed.data;

  // Clean up nullable FK fields
  const cleanData: Record<string, unknown> = { ...artikelData };
  if (!cleanData.marke_id)          cleanData.marke_id          = null;
  if (!cleanData.kategorie_id)      cleanData.kategorie_id      = null;
  if (cleanData.rabattpreis == null) cleanData.rabattpreis       = null;
  if (!cleanData.beschreibung)      cleanData.beschreibung       = null;
  if (!cleanData.meta_titel)        cleanData.meta_titel         = null;
  if (!cleanData.meta_beschreibung) cleanData.meta_beschreibung  = null;
  // varianten is already a plain array — Supabase will store it as JSONB

  // Slug fallback: auto-generate from titel when the admin didn't provide one.
  if (cleanData.titel && !cleanData.slug) {
    cleanData.slug = slugify(cleanData.titel as string);
  }

  // ── Insert with retry-on-slug-conflict ────────────────────────────────────
  // ONLY retries when the slug unique constraint fires (artikel_slug_key).
  // Any OTHER unique violation (e.g., duplicate Artikelnummer → artikel_artikelnummer_key)
  // is surfaced immediately with a translated user-friendly message.
  const MAX_SLUG_RETRIES = 10;
  let attempt = 0;
  let artikel: any = null;
  let artikelError: any = null;
  const baseSlug = (cleanData.slug as string) || `produkt-${Date.now()}`;
  let candidate = baseSlug;

  while (attempt <= MAX_SLUG_RETRIES) {
    const res = await admin
      .from('artikel')
      .insert({ ...cleanData, slug: candidate })
      .select()
      .single();

    artikel = res.data;
    artikelError = res.error;
    if (!artikelError) break;

    // Only the slug constraint (artikel_slug_key) triggers a retry.
    // All other unique violations (Artikelnummer, etc.) fail immediately.
    const isSlugConflict =
      (artikelError.code === '23505') &&
      (
        (artikelError.message  ?? '').includes('artikel_slug_key') ||
        (artikelError.details  ?? '').includes('artikel_slug_key')
      );

    if (isSlugConflict) {
      attempt += 1;
      candidate = `${baseSlug}-${attempt + 1}`; // → -2, -3, …
      continue;
    }

    // Any other error (including duplicate Artikelnummer) — stop immediately.
    break;
  }

  // Pass the FULL error object (not just .message) so apiDbError can read
  // the Postgres error code and translate it to a user-friendly message.
  if (artikelError) return apiDbError(artikelError);

  // Stock
  const stockBestand = typeof body.bestand === 'number' ? body.bestand : 0;
  const stockMindest = typeof body.mindestbestand === 'number' ? body.mindestbestand : 2;
  await admin.from('lagerbestaende').insert({ artikel_id: artikel.id, bestand: stockBestand, mindestbestand: stockMindest });

  // Technical data rich text — saved as a row in artikel_technische_daten
  if (technische_daten_rte) {
    await admin.from('artikel_technische_daten').insert({
      artikel_id: artikel.id,
      inhalt: technische_daten_rte,
      anzeige_reihenfolge: 0,
    });
  }

  // Images
  if (bilder?.length) {
    await admin.from('artikel_bilder').insert(
      bilder.map((img) => ({
        artikel_id: artikel.id,
        datei_id: img.datei_id || null,
        alt_text: img.alt_text || null,
        anzeige_reihenfolge: img.anzeige_reihenfolge,
      }))
    );
  }

  return NextResponse.json({ data: artikel }, { status: 201 });
}
