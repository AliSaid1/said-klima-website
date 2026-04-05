import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateFirmeneinstellungenSchema } from '@/lib/validators/firmeneinstellungen';

// GET /api/settings — Fetch company settings (singleton)
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
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
  // Authenticate via the user session (anon client)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateFirmeneinstellungenSchema.safeParse(body);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const messages = [
      ...flat.formErrors,
      ...Object.entries(flat.fieldErrors).map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`),
    ].join('; ');
    return NextResponse.json({ error: messages || 'Validierungsfehler' }, { status: 400 });
  }

  // Use service-role client for DB writes to bypass RLS
  const admin = createAdminClient();

  // Get existing settings row ID
  const { data: existing } = await admin
    .from('firmeneinstellungen')
    .select('id')
    .limit(1)
    .single();

  if (!existing) {
    // Create if doesn't exist
    const { data, error } = await admin
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
  const { data, error } = await admin
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

