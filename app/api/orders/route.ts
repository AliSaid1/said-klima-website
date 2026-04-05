import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiServerError } from '@/lib/api-response';

// GET /api/orders
// - Admin: all orders with full pagination/filter/sort
// - Regular user: only their own orders
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // Determine role
  const adminClient = createAdminClient();
  const { data: benutzer } = await adminClient
    .from('benutzer')
    .select('rolle')
    .eq('id', user.id)
    .single();
  const isAdmin = benutzer?.rolle === 'admin';

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  // Admin uses admin client (bypasses RLS); regular user uses session client (RLS scopes to user)
  const db = isAdmin ? adminClient : supabase;

  let query = db
    .from('bestellungen')
    .select('*, benutzer(vorname, nachname, email)', { count: 'exact' });

  // Non-admin: enforce user scope regardless of query params
  if (!isAdmin) {
    query = query.eq('benutzer_id', user.id);
  }

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`bestellnummer.ilike.%${search}%`);

  query = query.order('erstellt_am', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) return apiServerError(error.message);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

