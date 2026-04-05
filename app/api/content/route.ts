import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/content — List all content pages (admin panel uses this; service_role bypasses RLS
// so all rechtstexte are returned regardless of veröffentlicht status)
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('rechtstexte')
    .select('*')
    .order('titel', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
