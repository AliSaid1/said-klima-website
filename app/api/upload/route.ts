import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// 20 uploads per 15 minutes per authenticated user
const UPLOAD_MAX = 20;
const UPLOAD_WINDOW = 15 * 60;

// Max 10 MB
const MAX_SIZE = 10 * 1024 * 1024;

// Allow common image types and PDFs for uploads coming from the rich-text editor
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
];
// Whitelist buckets that uploads are allowed to target. Add a documents bucket
// for PDFs coming from the editor. The code falls back to 'product-images'.
const ALLOWED_BUCKETS = ['product-images', 'documents']; // whitelist — prevents uploading to arbitrary buckets

// POST /api/upload — Upload file to Supabase Storage
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  // Check admin role — admins shouldn't be rate limited in the admin UI
  // (helps when saving content with images via the editor)
  let isAdmin = false;
  try {
    const { data: benutzer } = await admin
      .from('benutzer')
      .select('rolle')
      .eq('id', user.id)
      .single();
    if ((benutzer as any)?.rolle === 'admin') isAdmin = true;
  } catch (e) {
    // Non-fatal — fall back to rate limit below
    console.error('[UPLOAD] admin role check failed', e);
  }

  if (!isAdmin) {
    // Rate limit per non-admin user
    const rl = await rateLimit(`rl:upload:${user.id}`, UPLOAD_MAX, UPLOAD_WINDOW);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Upload-Limit erreicht. Bitte warten Sie.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
  }

  // Reject oversized requests before parsing the body
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_SIZE + 4096 /* overhead */) {
    return NextResponse.json({ error: 'Anfrage zu groß (max. 10 MB)' }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bucketRaw = (formData.get('bucket') as string) || 'product-images';

  if (!file) {
    return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
  }

  // Validate bucket to prevent arbitrary bucket writes
  const bucket = ALLOWED_BUCKETS.includes(bucketRaw) ? bucketRaw : 'product-images';

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Dateityp nicht erlaubt. Erlaubt: JPEG, PNG, WebP, AVIF, SVG, PDF' },
      { status: 400 },
    );
  }

  // Max 10 MB (double-check after parse)
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Datei ist zu groß (max. 10 MB)' }, { status: 400 });
  }

  // Validate filename — strip path traversal attempts
  const rawName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = rawName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'pdf'];
  if (!safeExts.includes(ext)) {
    return NextResponse.json({ error: 'Ungültige Dateiendung' }, { status: 400 });
  }

  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  // Try uploading; if the bucket doesn't exist, attempt to create it (service-role client)
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('[UPLOAD] Storage error:', uploadError.message);

    // Detect a missing-bucket error message returned by Supabase/storage-js
    const msg = String(uploadError.message || '').toLowerCase();
    const bucketNotFound = /bucket/.test(msg) && /(not found|does not exist|not exist|404)/.test(msg);

    if (bucketNotFound && ALLOWED_BUCKETS.includes(bucket)) {
      console.info(`[UPLOAD] Bucket "${bucket}" not found — attempting to create it`);
      try {
        // createBucket is available on the admin client (service role)
        // The exact return shape can vary; treat any error as failure
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { data: createData, error: createError } = await admin.storage.createBucket(bucket, { public: true });
        if (createError) {
          console.error('[UPLOAD] createBucket error:', createError.message || createError);
          return NextResponse.json(
            { error: `Bucket "${bucket}" existiert nicht und konnte nicht erstellt werden. Bitte Administrator kontaktieren.` },
            { status: 500 },
          );
        }

        // Retry upload after creating bucket
        const { error: retryError } = await admin.storage
          .from(bucket)
          .upload(filename, file, { contentType: file.type, upsert: false });

        if (retryError) {
          console.error('[UPLOAD] retry upload error:', retryError.message || retryError);
          return NextResponse.json({ error: retryError.message || 'Upload fehlgeschlagen' }, { status: 500 });
        }

        // success — continue
      } catch (e) {
        console.error('[UPLOAD] bucket create/ retry exception:', e);
        return NextResponse.json(
          { error: `Bucket "${bucket}" existiert nicht und konnte nicht erstellt werden. Bitte Administrator kontaktieren.` },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  // Get public URL; fall back to signed URL for private buckets
  const { data: urlData } = admin.storage.from(bucket).getPublicUrl(filename);
  let publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    try {
      const { data: signedData, error: signedError } = await admin.storage
        .from(bucket)
        .createSignedUrl(filename, 60 * 60);
      if (signedError) console.error('[UPLOAD] createSignedUrl error:', signedError.message);
      else publicUrl = signedData?.signedUrl || publicUrl;
    } catch (e) {
      console.error('[UPLOAD] createSignedUrl exception', e);
    }
  }

  // Insert media record
  const { data: medienDatei, error: medienError } = await admin
    .from('medien_dateien')
    .insert({ speicherpfad: filename, mime_type: file.type, groesse_bytes: file.size })
    .select()
    .single();

  if (medienError) {
    console.error('[UPLOAD] medien_dateien error:', medienError.message);
    return NextResponse.json({ error: medienError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id: medienDatei.id, url: publicUrl, path: filename, bucket } });
}
