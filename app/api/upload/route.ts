import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/upload — Upload file to Supabase Storage
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bucket = (formData.get('bucket') as string) || 'product-images';

  if (!file) {
    return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Dateityp nicht erlaubt. Erlaubt: JPEG, PNG, WebP, AVIF, SVG' },
      { status: 400 }
    );
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Datei ist zu groß (max. 10 MB)' }, { status: 400 });
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  // Create medien_dateien record
  const { data: medienDatei, error: medienError } = await supabase
    .from('medien_dateien')
    .insert({
      speicherpfad: path,
      mime_type: file.type,
      groesse_bytes: file.size,
    })
    .select()
    .single();

  if (medienError) {
    return NextResponse.json({ error: medienError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      id: medienDatei.id,
      url: urlData.publicUrl,
      path,
      bucket,
    },
  });
}

