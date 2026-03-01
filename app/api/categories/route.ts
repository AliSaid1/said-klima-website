import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { kategorieSchema } from '@/lib/validators/artikel';

// GET /api/categories
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kategorien')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build tree structure
  const tree = buildTree(data || []);
  return NextResponse.json({ data: tree, flat: data });
}

// POST /api/categories
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = kategorieSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('kategorien')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/categories (update)
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  }

  const parsed = kategorieSchema.partial().safeParse(updateData);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('kategorien')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/categories
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  }

  // Check if category has products
  const { count } = await supabase
    .from('artikel')
    .select('*', { count: 'exact', head: true })
    .eq('kategorie_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Kategorie hat noch ${count} Produkt(e). Bitte zuerst die Produkte umziehen.` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('kategorien')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

