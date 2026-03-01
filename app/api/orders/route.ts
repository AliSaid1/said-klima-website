import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/orders — List orders with pagination, filter, sort
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('bestellungen')
    .select(`
      *,
      benutzer(vorname, nachname, email)
    `, { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`bestellnummer.ilike.%${search}%`);
  }

  query = query.order('erstellt_am', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
}

