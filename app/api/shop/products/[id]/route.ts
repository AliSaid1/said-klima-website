/**
 * Public shop product detail API route for artikel (products). It resolves an
 * active product by UUID or slug and returns catalog, image, stock, variant, and
 * technical-data details for storefront rendering.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetches one active shop product by UUID or slug.
 * GET /api/shop/products/[id].
 *
 * Auth: public through the Supabase session/anon client; only `aktiv=true`
 * artikel are returned.
 *
 * Route params: `id` may be an artikel UUID or a human-readable slug.
 *
 * Response: `200` with `{ data }`; `404` when no active product matches.
 *
 * Side effects: none; maps image storage paths to public URLs and sorts images
 * and technical-data rows for display.
 *
 * @param request - The incoming NextRequest.
 * @param context - Route context containing the promised product UUID or slug.
 * @returns A NextResponse containing public product detail data or a not-found error.
 */
// GET /api/shop/products/[id]
// Accepts either a UUID (e.g. /shop/2959b2b8-...) for backward-compat or a
// human-readable slug (e.g. /shop/daikin-sensira-35kw).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const SELECT = `
    id, artikelnummer, titel, slug, beschreibung, preis_brutto, rabattpreis, aktiv,
    installation_option_verfügbar, ist_ab_preis, varianten,
    marken(id, name),
    kategorien(id, name, slug),
    lagerbestaende(bestand),
    artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(speicherpfad)),
    artikel_technische_daten(id, inhalt, anzeige_reihenfolge)
  `;

  // UUID → look up by primary key; anything else → look up by slug.
  const query = UUID_RE.test(id)
    ? supabase.from('artikel').select(SELECT).eq('id', id).eq('aktiv', true).single()
    : supabase.from('artikel').select(SELECT).eq('slug', id).eq('aktiv', true).single();

  const { data, error } = await query;

  if (error || !data) {
    return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const productData = data as any;

  const product = {
    ...productData,
    technische_daten_rte: (productData.artikel_technische_daten as any[])?.[0]?.inhalt || null,
    artikel_bilder: (productData.artikel_bilder || [])
      .sort((a: { anzeige_reihenfolge: number }, b: { anzeige_reihenfolge: number }) =>
        a.anzeige_reihenfolge - b.anzeige_reihenfolge)
      .map((img: {
        id: string; datei_id: string; alt_text: string | null;
        anzeige_reihenfolge: number;
        medien_dateien: { speicherpfad: string } | null
      }) => {
        const path = img.medien_dateien?.speicherpfad || '';
        return {
          ...img,
          url: path.startsWith('http')
            ? path
            : (path ? `${supabaseUrl}/storage/v1/object/public/product-images/${path}` : ''),
        };
      }),
    artikel_technische_daten: (productData.artikel_technische_daten || [])
      .sort((a: { anzeige_reihenfolge: number }, b: { anzeige_reihenfolge: number }) =>
        a.anzeige_reihenfolge - b.anzeige_reihenfolge),
    varianten: productData.varianten || [],
  };

  return NextResponse.json({ data: product });
}
