import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateFirmeneinstellungenSchema } from '@/lib/validators/firmeneinstellungen';

// GET /api/settings — Fetch company settings (singleton)
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('firmeneinstellungen')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// PUT /api/settings — Update company settings
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateFirmeneinstellungenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Get existing settings row ID
  const { data: existing } = await supabase
    .from('firmeneinstellungen')
    .select('id')
    .limit(1)
    .single();

  if (!existing) {
    // Create if doesn't exist
    const { data, error } = await supabase
      .from('firmeneinstellungen')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  // Update existing
  const { data, error } = await supabase
    .from('firmeneinstellungen')
    .update(parsed.data)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

