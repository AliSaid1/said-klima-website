import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/content — List all content pages
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rechtstexte')
    .select('*')
    .order('titel', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

