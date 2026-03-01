import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createArtikelSchema } from '@/lib/validators/artikel';

// GET /api/products — List products with pagination, search, filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const kategorie = searchParams.get('kategorie') || '';
  const status = searchParams.get('status') || '';
  const marke = searchParams.get('marke') || '';
  const sortBy = searchParams.get('sortBy') || 'erstellt_am';
  const sortOrder = searchParams.get('sortOrder') === 'asc';

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('artikel')
    .select(`
      *,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand, mindestbestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(speicherpfad))
    `, { count: 'exact' });

  // Filters
  if (search) {
    query = query.or(`titel.ilike.%${search}%,artikelnummer.ilike.%${search}%`);
  }
  if (kategorie) {
    query = query.eq('kategorie_id', kategorie);
  }
  if (status === 'aktiv') {
    query = query.eq('aktiv', true);
  } else if (status === 'inaktiv') {
    query = query.eq('aktiv', false);
  }
  if (marke) {
    query = query.eq('marke_id', marke);
  }

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

// POST /api/products — Create a new product
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createArtikelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bilder, technische_daten, ...artikelData } = parsed.data;

  // Insert product
  const { data: artikel, error: artikelError } = await supabase
    .from('artikel')
    .insert(artikelData)
    .select()
    .single();

  if (artikelError) {
    return NextResponse.json({ error: artikelError.message }, { status: 500 });
  }

  // Insert stock record
  await supabase
    .from('lagerbestaende')
    .insert({ artikel_id: artikel.id, bestand: 0, mindestbestand: 2 });

  // Insert technical data
  if (technische_daten && technische_daten.length > 0) {
    const techRows = technische_daten.map((td) => ({
      artikel_id: artikel.id,
      schluessel: td.schluessel,
      wert: td.wert,
      anzeige_reihenfolge: td.anzeige_reihenfolge,
    }));
    await supabase.from('artikel_technische_daten').insert(techRows);
  }

  // Insert images
  if (bilder && bilder.length > 0) {
    const imageRows = bilder.map((img) => ({
      artikel_id: artikel.id,
      datei_id: img.datei_id || null,
      alt_text: img.alt_text || null,
      anzeige_reihenfolge: img.anzeige_reihenfolge,
    }));
    await supabase.from('artikel_bilder').insert(imageRows);
  }

  return NextResponse.json({ data: artikel }, { status: 201 });
}

