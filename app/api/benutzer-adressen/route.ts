/**
 * User address (Benutzer-Adresse) API routes.
 *
 * Manages authenticated users' addresses (Adresse) in the Supabase
 * `benutzer_adressen` table, including default shipping and billing address
 * flags. Uses the admin client for writes after verifying the authenticated
 * user via the server Supabase client.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { adresseSchema } from '@/lib/validators/adresse';

/**
 * Resolves the currently authenticated Supabase user for address ownership checks.
 *
 * @returns The authenticated user object, or null when the request is anonymous.
 */
// ── Shared auth helper ─────────────────────────────────────────────────────
async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * POST /api/benutzer-adressen
 *
 * Authenticated-user endpoint that creates an address (Adresse) for the current
 * user (Benutzer). Reads a JSON body validated by `adresseSchema` with address
 * fields such as `strasse`, `plz`, `ort`, optional `bundesland`, `land`, and
 * default flags `standard_lieferadresse` / `standard_rechnungsadresse`.
 *
 * Returns `200` with `{ data }` for the inserted `benutzer_adressen` row.
 * Returns `400` for validation or JSON/body errors, `401` for anonymous
 * callers, and `500` for Supabase insert failures.
 *
 * Side effects: inserts into `benutzer_adressen`; when a default flag is true,
 * clears the same default flag on the user's other addresses.
 *
 * @param req - The incoming Request containing the address JSON body.
 * @returns A NextResponse with the created address row or an error.
 */
// POST /api/benutzer-adressen — create address (authenticated user only, for their own account)
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const admin = createAdminClient();
  try {
    const body = await req.json();
    const parsed = adresseSchema.parse(body);
    const { strasse, plz, ort, bundesland, land, standard_lieferadresse, standard_rechnungsadresse } = parsed as any;

    // Always use the authenticated user's id — ignore any benutzer_id from the request body
    const benutzer_id = user.id;

    const { data, error } = await admin
      .from('benutzer_adressen')
      .insert({
        benutzer_id,
        strasse,
        plz,
        ort,
        bundesland: bundesland || null,
        land: land || 'DE',
        standard_lieferadresse: !!standard_lieferadresse,
        standard_rechnungsadresse: !!standard_rechnungsadresse,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data?.id) {
      if (standard_lieferadresse) {
        await admin.from('benutzer_adressen').update({ standard_lieferadresse: false }).eq('benutzer_id', benutzer_id).neq('id', data.id);
      }
      if (standard_rechnungsadresse) {
        await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: false }).eq('benutzer_id', benutzer_id).neq('id', data.id);
      }
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validierungsfehler: ' + err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

/**
 * PUT /api/benutzer-adressen
 *
 * Authenticated-user endpoint that updates one owned address (Adresse). Reads
 * a JSON body validated by `adresseSchema`, including required `id` plus
 * address fields and default-address flags.
 *
 * Returns `200` with `{ data }` for the updated `benutzer_adressen` row.
 * Returns `400` when `id` is missing or validation/body parsing fails, `401`
 * for anonymous callers, `403` when the address belongs to another user,
 * `404` when the address does not exist, and `500` for Supabase update errors.
 *
 * Side effects: updates `benutzer_adressen.aktualisiert_am`; when a default
 * flag is true, clears the same default flag on the user's other addresses.
 *
 * @param req - The incoming Request containing the address update JSON body.
 * @returns A NextResponse with the updated address row or an error.
 */
// PUT /api/benutzer-adressen — update address (owner only)
export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const admin = createAdminClient();
  try {
    const body = await req.json();
    const parsed = adresseSchema.parse(body);
    const { id, strasse, plz, ort, bundesland, land, standard_lieferadresse, standard_rechnungsadresse } = parsed as any;

    if (!id) return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });

    // Verify the address belongs to the authenticated user (IDOR prevention)
    const { data: existing } = await admin
      .from('benutzer_adressen')
      .select('benutzer_id')
      .eq('id', id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Adresse nicht gefunden' }, { status: 404 });
    if (existing.benutzer_id !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { data, error } = await admin
      .from('benutzer_adressen')
      .update({
        strasse,
        plz,
        ort,
        bundesland: bundesland || null,
        land: land || 'DE',
        standard_lieferadresse: !!standard_lieferadresse,
        standard_rechnungsadresse: !!standard_rechnungsadresse,
        aktualisiert_am: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data) {
      if (standard_lieferadresse) {
        await admin.from('benutzer_adressen').update({ standard_lieferadresse: false }).eq('benutzer_id', user.id).neq('id', id);
      }
      if (standard_rechnungsadresse) {
        await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: false }).eq('benutzer_id', user.id).neq('id', id);
      }
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validierungsfehler: ' + err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

/**
 * DELETE /api/benutzer-adressen
 *
 * Authenticated-user endpoint that deletes one owned address (Adresse). Reads
 * query param `id` for the `benutzer_adressen` row to delete.
 *
 * Returns `200` with `{ success: true }`. Returns `400` when `id` is missing
 * or URL handling fails, `401` for anonymous callers, `403` when the address
 * belongs to another user, `404` when the address does not exist, and `500`
 * for Supabase delete errors.
 *
 * Side effects: deletes one row from `benutzer_adressen`.
 *
 * @param req - The incoming Request containing the address ID query parameter.
 * @returns A NextResponse confirming deletion or describing an error.
 */
// DELETE /api/benutzer-adressen — delete address (owner only)
export async function DELETE(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const admin = createAdminClient();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Verify ownership (IDOR prevention)
    const { data: existing } = await admin
      .from('benutzer_adressen')
      .select('benutzer_id')
      .eq('id', id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Adresse nicht gefunden' }, { status: 404 });
    if (existing.benutzer_id !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { error } = await admin.from('benutzer_adressen').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}

/**
 * PATCH /api/benutzer-adressen
 *
 * Authenticated-user endpoint that marks one owned address (Adresse) as the
 * default shipping (`type: "liefer"`) or billing (`type: "rechnung"`) address.
 * Reads JSON body fields `id` and `type`.
 *
 * Returns `200` with `{ success: true }`. Returns `400` when `id`/`type` is
 * missing, `type` is invalid, or body parsing fails; `401` for anonymous
 * callers; `403` when the address belongs to another user; and `404` when the
 * address does not exist.
 *
 * Side effects: updates default flags in `benutzer_adressen`, setting the
 * requested address as default and clearing that default on the user's other
 * addresses.
 *
 * @param req - The incoming Request containing the default-address JSON body.
 * @returns A NextResponse confirming the default update or describing an error.
 */
// PATCH /api/benutzer-adressen — set default address (owner only)
export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const admin = createAdminClient();
  try {
    const body = await req.json();
    const { id, type } = body as any;
    if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 });

    // Verify ownership (IDOR prevention)
    const { data: existing } = await admin
      .from('benutzer_adressen')
      .select('benutzer_id')
      .eq('id', id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Adresse nicht gefunden' }, { status: 404 });
    if (existing.benutzer_id !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    if (type === 'liefer') {
      await admin.from('benutzer_adressen').update({ standard_lieferadresse: true }).eq('id', id);
      await admin.from('benutzer_adressen').update({ standard_lieferadresse: false }).eq('benutzer_id', user.id).neq('id', id);
      return NextResponse.json({ success: true });
    }
    if (type === 'rechnung') {
      await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: true }).eq('id', id);
      await admin.from('benutzer_adressen').update({ standard_rechnungsadresse: false }).eq('benutzer_id', user.id).neq('id', id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 400 });
  }
}
