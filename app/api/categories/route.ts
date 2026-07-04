/**
 * Category (Kategorie) API routes for catalog navigation.
 *
 * Lists public category data as both a tree and a flat list, and provides
 * admin-only creation, update, and deletion of Supabase `kategorien` rows.
 * Delete checks the `artikel` (product) table before removing a category.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guard';
import { kategorieSchema } from '@/lib/validators/artikel';
import { apiDbError } from '@/lib/api-response';

/**
 * GET /api/categories
 *
 * Public endpoint that lists categories (Kategorien) ordered by name and
 * returns both a nested tree and the flat Supabase result.
 *
 * Returns `200` with `{ data, flat }`, where `data` is the category tree and
 * `flat` is the raw category list. Returns a database error response from
 * `apiDbError` when the Supabase query fails.
 *
 * Side effects: none; reads only `kategorien`.
 *
 * @returns A NextResponse containing category tree data or a database error.
 */
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

/**
 * POST /api/categories
 *
 * Admin-only endpoint that creates a category (Kategorie). Reads a JSON body
 * validated by `kategorieSchema`.
 *
 * Returns `201` with `{ data }` for the inserted `kategorien` row. Returns
 * `400` for validation errors, `401`/`403` from `requireAdmin`, and a database
 * error response from `apiDbError` for Supabase failures.
 *
 * Side effects: inserts one row into `kategorien`.
 *
 * @param request - The incoming NextRequest containing the category JSON body.
 * @returns A NextResponse with the created category or an error.
 */
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

/**
 * PUT /api/categories
 *
 * Admin-only endpoint that updates a category (Kategorie). Reads JSON body
 * field `id` plus partial category fields validated by
 * `kategorieSchema.partial()`.
 *
 * Returns `200` with `{ data }` for the updated `kategorien` row. Returns
 * `400` when `id` is missing or validation fails, `401`/`403` from
 * `requireAdmin`, and a database error response from `apiDbError` for Supabase
 * failures.
 *
 * Side effects: updates one row in `kategorien`.
 *
 * @param request - The incoming NextRequest containing the category update JSON body.
 * @returns A NextResponse with the updated category or an error.
 */
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

/**
 * DELETE /api/categories
 *
 * Admin-only endpoint that deletes a category (Kategorie). Reads query param
 * `id`. Before deleting, checks whether any product (Artikel) rows in
 * `artikel` still reference the category.
 *
 * Returns `200` with `{ success: true }`. Returns `400` when `id` is missing
 * or the category still has products, `401`/`403` from `requireAdmin`, and a
 * database error response from `apiDbError` for Supabase delete failures.
 *
 * Side effects: reads `artikel` for reference counts and deletes from
 * `kategorien`.
 *
 * @param request - The incoming NextRequest containing the category ID query parameter.
 * @returns A NextResponse confirming deletion or describing an error.
 */
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

/**
 * Supabase category row used to build the public category tree.
 */
// Helper: Build category tree
interface KategorieRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

/**
 * Category node returned by the public tree response, with nested children.
 */
interface KategorieNode extends KategorieRow {
  children: KategorieNode[];
}

/**
 * Builds a nested category tree from flat category rows using `parent_id`.
 *
 * @param items - Flat category rows from Supabase.
 * @returns Root category nodes with recursive `children` arrays.
 */
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
