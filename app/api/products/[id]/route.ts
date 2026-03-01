import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateArtikelSchema } from '@/lib/validators/artikel';

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('artikel')
    .select(`
      *,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand, mindestbestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge, medien_dateien(id, speicherpfad, mime_type)),
      artikel_technische_daten(id, schluessel, wert, anzeige_reihenfolge)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateArtikelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bilder, technische_daten, ...artikelData } = parsed.data;

  // Update product
  if (Object.keys(artikelData).length > 0) {
    const { error: updateError } = await supabase
      .from('artikel')
      .update(artikelData)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Update technical data (replace all)
  if (technische_daten !== undefined) {
    await supabase.from('artikel_technische_daten').delete().eq('artikel_id', id);
    if (technische_daten.length > 0) {
      const techRows = technische_daten.map((td) => ({
        artikel_id: id,
        schluessel: td.schluessel,
        wert: td.wert,
        anzeige_reihenfolge: td.anzeige_reihenfolge,
      }));
      await supabase.from('artikel_technische_daten').insert(techRows);
    }
  }

  // Update images (replace all)
  if (bilder !== undefined) {
    await supabase.from('artikel_bilder').delete().eq('artikel_id', id);
    if (bilder.length > 0) {
      const imageRows = bilder.map((img) => ({
        artikel_id: id,
        datei_id: img.datei_id || null,
        alt_text: img.alt_text || null,
        anzeige_reihenfolge: img.anzeige_reihenfolge,
      }));
      await supabase.from('artikel_bilder').insert(imageRows);
    }
  }

  // Fetch updated product
  const { data } = await supabase
    .from('artikel')
    .select(`
      *,
      marken(id, name),
      kategorien(id, name, slug),
      lagerbestaende(bestand, mindestbestand),
      artikel_bilder(id, datei_id, alt_text, anzeige_reihenfolge),
      artikel_technische_daten(id, schluessel, wert, anzeige_reihenfolge)
    `)
    .eq('id', id)
    .single();

  return NextResponse.json({ data });
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { error } = await supabase
    .from('artikel')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

