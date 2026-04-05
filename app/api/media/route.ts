import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// GET /api/media — List all uploaded media files (admin only)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify admin role
  const { data: benutzer } = await admin
    .from('benutzer')
    .select('rolle')
    .eq('id', user.id)
    .single();
  if (benutzer?.rolle !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('medien_dateien')
    .select('id, speicherpfad, mime_type, groesse_bytes, erstellt_am')
    .order('erstellt_am', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build public URLs
  const files = (data || []).map((f) => {
    const { data: urlData } = admin.storage.from('product-images').getPublicUrl(f.speicherpfad);
    return {
      id: f.id,
      url: urlData.publicUrl,
      speicherpfad: f.speicherpfad,
      mime_type: f.mime_type,
      groesse_bytes: f.groesse_bytes,
      erstellt_am: f.erstellt_am,
    };
  });

  return NextResponse.json({ data: files });
}
