import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guard';
import { kategorieSchema } from '@/lib/validators/artikel';
import { apiDbError } from '@/lib/api-response';

// GET /api/categories
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('kategorien')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return apiDbError(error);
  }

  // Build tree structure
  const tree = buildTree(data || []);
  return NextResponse.json({ data: tree, flat: data });
}

// POST /api/categories — admin only
export async function POST(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();


  const body = await request.json();
  const parsed = kategorieSchema.safeParse(body);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const messages = [
      ...flat.formErrors,
      ...Object.entries(flat.fieldErrors).map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`),
    ].join('; ');
    return NextResponse.json({ error: messages || 'Validierungsfehler' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('kategorien')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return apiDbError(error);
  }

  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/categories — admin only
export async function PUT(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();


  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  }

  const parsed = kategorieSchema.partial().safeParse(updateData);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const messages = [
      ...flat.formErrors,
      ...Object.entries(flat.fieldErrors).map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`),
    ].join('; ');
    return NextResponse.json({ error: messages || 'Validierungsfehler' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('kategorien')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return apiDbError(error);
  }

  return NextResponse.json({ data });
}

// DELETE /api/categories — admin only
export async function DELETE(request: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const admin = createAdminClient();


  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  }

  // Check if category has products
  const { count } = await admin
    .from('artikel')
    .select('*', { count: 'exact', head: true })
    .eq('kategorie_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Kategorie hat noch ${count} Produkt(e). Bitte zuerst die Produkte umziehen.` },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from('kategorien')
    .delete()
    .eq('id', id);

  if (error) {
    return apiDbError(error);
  }

  return NextResponse.json({ success: true });
}

// Helper: Build category tree
interface KategorieRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface KategorieNode extends KategorieRow {
  children: KategorieNode[];
}

function buildTree(items: KategorieRow[]): KategorieNode[] {
  const map = new Map<string, KategorieNode>();
  const roots: KategorieNode[] = [];

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

