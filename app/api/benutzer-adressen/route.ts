import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { adresseSchema } from '@/lib/validators/adresse';

// This route handles create (POST), update (PUT), delete (DELETE) and patch defaults (PATCH)
export async function POST(req: Request) {
  const admin = createAdminClient();
  try {
    const body = await req.json();
    const parsed = adresseSchema.parse(body);
    const { strasse, plz, ort, bundesland, land, standard_lieferadresse, standard_rechnungsadresse, benutzer_id } = parsed as any;
    if (!benutzer_id) return NextResponse.json({ error: 'benutzer_id erforderlich' }, { status: 400 });

    const { data, error } = await admin
      .from('benutzer_adressen')
      .insert({ benutzer_id, strasse, plz, ort, bundesland: bundesland || null, land: land || 'DE', standard_lieferadresse: !!standard_lieferadresse, standard_rechnungsadresse: !!standard_rechnungsadresse })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If flags were set, clear others
    if (data && data.id) {
      if (standard_lieferadresse) {
        await admin.from('benutzer_adressen').update({ standard_lieferadresse: false }).eq('benutzer_id', benutzer_id).neq('id', data.id);
      }
      if (standard_rechnungsadresse) {
        await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: false }).eq('benutzer_id', benutzer_id).neq('id', data.id);
      }
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validierungsfehler: ' + err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const admin = createAdminClient();
  try {
    const body = await req.json();
    const parsed = adresseSchema.parse(body);
    const { id, strasse, plz, ort, bundesland, land, standard_lieferadresse, standard_rechnungsadresse, benutzer_id } = parsed as any;

    if (!id) return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });
    if (!benutzer_id) return NextResponse.json({ error: 'benutzer_id erforderlich' }, { status: 400 });

    const { data, error } = await admin
      .from('benutzer_adressen')
      .update({ strasse, plz, ort, bundesland: bundesland || null, land: land || 'DE', standard_lieferadresse: !!standard_lieferadresse, standard_rechnungsadresse: !!standard_rechnungsadresse, aktualisiert_am: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data) {
      if (standard_lieferadresse) {
        await admin.from('benutzer_adressen').update({ standard_lieferadresse: false }).eq('benutzer_id', benutzer_id).neq('id', id);
      }
      if (standard_rechnungsadresse) {
        await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: false }).eq('benutzer_id', benutzer_id).neq('id', id);
      }
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validierungsfehler: ' + err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const admin = createAdminClient();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await admin.from('benutzer_adressen').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  // This endpoint will accept { id, type: 'liefer'|'rechnung', benutzer_id }
  const admin = createAdminClient();
  try {
    const body = await req.json();
    const { id, type, benutzer_id } = body as any;
    if (!id || !type || !benutzer_id) return NextResponse.json({ error: 'id, type and benutzer_id required' }, { status: 400 });

    if (type === 'liefer') {
      await admin.from('benutzer_adressen').update({ standard_lieferadresse: true }).eq('id', id);
      await admin.from('benutzer_adressen').update({ standard_lieferadresse: false }).eq('benutzer_id', benutzer_id).neq('id', id);
      return NextResponse.json({ success: true });
    }
    if (type === 'rechnung') {
      await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: true }).eq('id', id);
      await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: false }).eq('benutzer_id', benutzer_id).neq('id', id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

