import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Helpers for the payment E2E tests.
 *
 * These tests need real Stripe *test-mode* secrets and the Supabase service
 * role key, which are only present when configured in the environment / CI
 * secrets. Use the `*Configured()` guards with test.skip() so the suite is a
 * no-op (rather than a failure) on machines without the keys.
 */

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the Stripe test secret + webhook signing secret are available. */
export function stripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET);
}

/** True when a Supabase service-role client can be created (needed to seed orders). */
export function serviceConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

/** Service-role Supabase client (bypasses RLS) for seeding/inspecting test data. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Produces a valid `stripe-signature` header for a raw JSON payload, signed
 * with the same STRIPE_WEBHOOK_SECRET the webhook route verifies against.
 * generateTestHeaderString performs no network calls and does not need a real
 * API key, so a dummy secret key is fine for the Stripe instance.
 */
export function signWebhook(payload: string): string {
  const client = new Stripe(STRIPE_SECRET_KEY || 'sk_test_dummy');
  return client.webhooks.generateTestHeaderString({
    payload,
    secret: STRIPE_WEBHOOK_SECRET as string,
  });
}

/** Builds a minimal Stripe webhook Event envelope wrapping a checkout session. */
export function checkoutEvent(
  type: string,
  session: Record<string, unknown>,
): string {
  return JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2026-02-25.clover',
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: { object: 'checkout.session', ...session } },
  });
}

/**
 * Inserts a minimal order (bestellungen) row so a webhook handler has an order
 * to transition. Returns the order id + bestellnummer. Caller should clean up.
 */
export async function seedOrder(
  db: SupabaseClient,
): Promise<{ id: string; bestellnummer: string }> {
  const bestellnummer = `E2E-${Date.now()}`;
  const { data, error } = await db
    .from('bestellungen')
    .insert({
      bestellnummer,
      status: 'offen',
      zwischensumme_brutto: 100.0,
      steuer_summe: 19.0,
      versand_brutto: 0,
      gesamt_brutto: 119.0,
      rechnungsadresse_json: { name: 'E2E Test', strasse: 'Teststr. 1', plz: '10115', ort: 'Berlin', land: 'DE' },
      gast_email: 'e2e-payment@said-klima.de',
    })
    .select('id, bestellnummer')
    .single();

  if (error) throw new Error(`seedOrder failed: ${error.message}`);
  return data as { id: string; bestellnummer: string };
}

export async function deleteOrder(db: SupabaseClient, id: string): Promise<void> {
  await db.from('bestellungen').delete().eq('id', id);
}
