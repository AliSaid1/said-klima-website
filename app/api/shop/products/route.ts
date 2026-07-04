/**
 * Public shop product listing API route for artikel (products). It exposes
 * active catalog data with marken, kategorien, lagerbestaende (stock), images,
 * technical data, variants, and public Supabase Storage URLs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Lists active products for the public shop.
 * GET /api/shop/products.
 *
 * Auth: public through the Supabase session/anon client with RLS-enforced
 * `aktiv=true` filtering.
 *
 * Query params: optional `search`, `kategorie`, `marke`, and `maxPreis`.
 *
 * Response: `200` with `{ data }`; `500` when Supabase cannot read artikel or
 * related rows.
 *
 * Side effects: none; maps image storage paths to public URLs and filters
 * `maxPreis` in memory.
 *
 * @param request - The incoming NextRequest containing shop filter query parameters.
 * @returns A NextResponse containing public product cards/details for the shop.
 */
// GET /api/shop/products — Public endpoint for shop products
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') || '';
  const kategorie = searchParams.get('kategorie') || '';
  const marke = searchParams.get('marke') || '';
  const maxPreis = searchParams.get('maxPreis') || '';

  let query = supabase
    .from('artikel')
    .select(`
      id, artikelnummer, titel, slug, beschreibung, preis_brutto, rabattpreis, aktiv,
      ist_ab_preis, varianten,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(speicherpfad)),
      artikel_technische_daten(id, inhalt, anzeige_reihenfolge)
    `)
    .eq('aktiv', true)
    .order('erstellt_am', { ascending: false });

  if (search) {
    query = query.or(`titel.ilike.%${search}%,beschreibung.ilike.%${search}%`);
  }
  if (kategorie) {
    query = query.eq('kategorie_id', kategorie);
  }
  if (marke) {
    query = query.eq('marke_id', marke);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build public URLs for images
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const products = (data as any[] || []).map((p) => ({
    ...p,
    // Expose rich-text as technische_daten_rte for frontend compatibility
    technische_daten_rte: (p.artikel_technische_daten as any[])?.[0]?.inhalt || null,
    artikel_bilder: (p.artikel_bilder || [])
      .sort((a: { anzeige_reihenfolge: number }, b: { anzeige_reihenfolge: number }) => a.anzeige_reihenfolge - b.anzeige_reihenfolge)
      .map((img: { id: string; datei_id: string; alt_text: string | null; anzeige_reihenfolge: number; medien_dateien: { speicherpfad: string } | null }) => {
        const path = img.medien_dateien?.speicherpfad || '';
        return {
          ...img,
          url: path.startsWith('http') ? path : (path ? `${supabaseUrl}/storage/v1/object/public/product-images/${path}` : ''),
        };
      }),
    // `varianten` is JSONB [{name, preis_aufschlag}] — array order is display order
    varianten: (p.varianten || []),
  }));

  // Filter by maxPreis client-side (easier than supabase numeric filter)
  let filtered = products;
  if (maxPreis) {
    const max = parseFloat(maxPreis);
    filtered = products.filter((p) => Number(p.preis_brutto) <= max);
  }

  return NextResponse.json({ data: filtered });
}
