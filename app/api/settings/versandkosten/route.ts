/**
 * Public shipping-cost settings API route for versandkosten (shipping cost).
 * It exposes only the shipping amount and free-shipping threshold from
 * firmeneinstellungen (company settings).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Fetches shipping cost settings for cart calculations.
 * GET /api/settings/versandkosten.
 *
 * Auth: public through the Supabase session/anon client.
 *
 * Request shape: no body or query parameters are read.
 *
 * Response: `200` with `{ versandkosten, versandkostenlos_ab }`; falls back to
 * safe defaults when the database row is missing or unreadable.
 *
 * Side effects: none.
 *
 * @returns A NextResponse containing shipping cost values.
 */
// GET /api/settings/versandkosten
// Public endpoint — returns only the shipping cost settings.
// Used by the cart page (client component) and any other front-end that needs
// the shipping thresholds without loading the full admin settings object.
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('firmeneinstellungen')
    .select('versandkosten, versandkostenlos_ab')
    .limit(1)
    .single();

  if (error || !data) {
    // Fall back to safe defaults so the cart still works even if DB is unreachable
    return NextResponse.json({ versandkosten: 5, versandkostenlos_ab: 500 });
  }

  return NextResponse.json({
    versandkosten:       Number(data.versandkosten       ?? 5),
    versandkostenlos_ab: Number(data.versandkostenlos_ab ?? 500),
  });
}
