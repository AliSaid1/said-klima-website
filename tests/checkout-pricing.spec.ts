import { test, expect, type APIRequestContext } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BASE_URL } from './helpers/auth';
import { stripeConfigured, serviceConfigured, adminClient } from './helpers/stripe';

/**
 * Server-side pricing-integrity tests for POST /api/checkout.
 *
 * These are the highest-value money-path guarantees: the checkout route must
 * derive every line price from the database and completely ignore anything the
 * client sends. Each test places an order, then reads the persisted
 * `bestellungen` row (via the service-role client) to assert the totals, and
 * finally deletes the order so re-runs stay idempotent.
 *
 * Covered:
 *  - a hostile client-supplied `preis` is ignored (base price wins),
 *  - a `rabattpreis` discount is applied,
 *  - a variant `preis_aufschlag` surcharge is added,
 *  - an unknown `variant_id` is ignored (falls back to the base price).
 *
 * Requires Stripe test secrets (a real Checkout Session is created) and the
 * Supabase service role (to inspect + clean up the order).
 */

/** Seeded "Daikin Sensira": 899.00 € gross, no discount, no variants. */
const ARTIKEL_ID = 'a1000000-0000-4000-8000-000000000001';
/** Seeded discount fixture: preis_brutto 1000.00, rabattpreis 750.00. */
const DISCOUNT_ID = 'a1000000-0000-4000-8000-000000000009';
/** Seeded variant fixture: preis_brutto 1000.00, "5 kW" surcharge +200.00. */
const VARIANT_ID = 'a1000000-0000-4000-8000-00000000000a';
/** Seeded cheap fixture: 99.00 € gross, below the free-shipping threshold. */
const CHEAP_ID = 'a1000000-0000-4000-8000-00000000000c';

/**
 * POSTs a cart to the checkout endpoint.
 *
 * @param request - Playwright's request fixture.
 * @param body    - The checkout payload (items + optional customer data).
 */
async function postCheckout(request: APIRequestContext, body: unknown) {
  return request.post(`${BASE_URL}/api/checkout`, {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify(body),
  });
}

/**
 * Places a single-item order, asserts the persisted subtotal/VAT/total match
 * the expected server-computed values, then deletes the order.
 *
 * @param request          - Playwright's request fixture.
 * @param db               - Service-role client used to read + clean up the order.
 * @param item             - The cart line (artikel_id, menge, optional variant_id / hostile preis).
 * @param expectedSubtotal - The gross subtotal the server should compute from the DB.
 */
async function expectOrderSubtotal(
  request: APIRequestContext,
  db: SupabaseClient,
  item: Record<string, unknown>,
  expectedSubtotal: number,
) {
  const res = await postCheckout(request, {
    items: [item],
    kunden_email: 'e2e-pricing@said-klima.de',
  });
  expect(res.status()).toBe(200);
  const { bestellung_id } = await res.json();
  expect(bestellung_id).toBeTruthy();

  try {
    const { data: order, error } = await db
      .from('bestellungen')
      .select('zwischensumme_brutto, steuer_summe, versand_brutto, gesamt_brutto')
      .eq('id', bestellung_id)
      .single();

    expect(error).toBeNull();
    const expectedTax = Math.round(expectedSubtotal * (19 / 119) * 100) / 100;

    expect(Number(order!.zwischensumme_brutto)).toBeCloseTo(expectedSubtotal, 2);
    expect(Number(order!.steuer_summe)).toBeCloseTo(expectedTax, 2);
    expect(Number(order!.gesamt_brutto)).toBeCloseTo(
      expectedSubtotal + Number(order!.versand_brutto),
      2,
    );
  } finally {
    await db.from('bestellpositionen').delete().eq('bestellung_id', bestellung_id);
    await db.from('bestellungen').delete().eq('id', bestellung_id);
  }
}

/** Reads the effective shipping settings the way the checkout route does. */
async function shippingSettings(db: SupabaseClient) {
  const { data } = await db
    .from('firmeneinstellungen')
    .select('versandkosten, versandkostenlos_ab')
    .limit(1)
    .single();
  return {
    satz: Number(data?.versandkosten ?? 5),
    gratisAb: Number(data?.versandkostenlos_ab ?? 500),
  };
}

/** Places an order, returns its id + persisted totals; caller cleans up. */
async function placeOrder(
  request: APIRequestContext,
  db: SupabaseClient,
  items: Array<Record<string, unknown>>,
) {
  const res = await postCheckout(request, { items, kunden_email: 'e2e-pricing@said-klima.de' });
  expect(res.status()).toBe(200);
  const { bestellung_id } = await res.json();
  const { data: order } = await db
    .from('bestellungen')
    .select('zwischensumme_brutto, versand_brutto, gesamt_brutto')
    .eq('id', bestellung_id)
    .single();
  return { bestellung_id, order: order! };
}

async function cleanupOrder(db: SupabaseClient, bestellungId: string) {
  await db.from('bestellpositionen').delete().eq('bestellung_id', bestellungId);
  await db.from('bestellungen').delete().eq('id', bestellungId);
}

test.describe('Checkout pricing integrity', () => {
  test.beforeEach(() => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe test secrets and SUPABASE_SERVICE_ROLE_KEY required',
    );
  });

  /** A client-supplied price is ignored; the DB `preis_brutto` (899 × 2) wins. */
  test('ignores client-supplied prices and totals from the DB', async ({ request }) => {
    // `preis: 1` is a hostile client value that MUST be ignored server-side.
    await expectOrderSubtotal(request, adminClient(), { artikel_id: ARTIKEL_ID, menge: 2, preis: 1 }, 899.0 * 2);
  });

  /** A `rabattpreis` discount (1000 → 750) is applied to the order total. */
  test('applies the rabattpreis discount', async ({ request }) => {
    await expectOrderSubtotal(request, adminClient(), { artikel_id: DISCOUNT_ID, menge: 1 }, 750.0);
  });

  /** A known variant adds its surcharge to the base price (1000 + 200 = 1200). */
  test('adds the variant surcharge (preis_aufschlag)', async ({ request }) => {
    await expectOrderSubtotal(
      request,
      adminClient(),
      { artikel_id: VARIANT_ID, variant_id: '5 kW', menge: 1 },
      1200.0,
    );
  });

  /** An unknown variant_id is ignored — the base price (1000) is charged, no surcharge. */
  test('ignores an unknown variant_id and charges the base price', async ({ request }) => {
    await expectOrderSubtotal(
      request,
      adminClient(),
      { artikel_id: VARIANT_ID, variant_id: 'does-not-exist', menge: 1 },
      1000.0,
    );
  });

  /** Below the free-shipping threshold, the flat shipping rate is added. */
  test('charges standard shipping below the free-shipping threshold', async ({ request }) => {
    const db = adminClient();
    const { satz, gratisAb } = await shippingSettings(db);
    const { bestellung_id, order } = await placeOrder(request, db, [
      { artikel_id: CHEAP_ID, menge: 1 },
    ]);
    try {
      expect(Number(order.zwischensumme_brutto)).toBeCloseTo(99.0, 2);
      // 99 € is below the (default 500 €) threshold, so shipping is charged.
      const expectedVersand = 99.0 >= gratisAb ? 0 : satz;
      expect(Number(order.versand_brutto)).toBeCloseTo(expectedVersand, 2);
      expect(Number(order.gesamt_brutto)).toBeCloseTo(99.0 + expectedVersand, 2);
    } finally {
      await cleanupOrder(db, bestellung_id);
    }
  });

  /** At/above the free-shipping threshold, shipping is waived (0). */
  test('waives shipping at or above the free-shipping threshold', async ({ request }) => {
    const db = adminClient();
    const { gratisAb } = await shippingSettings(db);
    const { bestellung_id, order } = await placeOrder(request, db, [
      { artikel_id: ARTIKEL_ID, menge: 1 }, // 899 € ≥ 500 € default threshold
    ]);
    try {
      const expectedVersand = 899.0 >= gratisAb ? 0 : (await shippingSettings(db)).satz;
      expect(Number(order.versand_brutto)).toBeCloseTo(expectedVersand, 2);
      expect(Number(order.gesamt_brutto)).toBeCloseTo(899.0 + expectedVersand, 2);
    } finally {
      await cleanupOrder(db, bestellung_id);
    }
  });

  /** Multiple line items are summed from DB prices (899 + 2 × 99 = 1097). */
  test('sums multiple line items from the DB', async ({ request }) => {
    const db = adminClient();
    const { bestellung_id, order } = await placeOrder(request, db, [
      { artikel_id: ARTIKEL_ID, menge: 1 },
      { artikel_id: CHEAP_ID, menge: 2 },
    ]);
    try {
      expect(Number(order.zwischensumme_brutto)).toBeCloseTo(1097.0, 2);
    } finally {
      await cleanupOrder(db, bestellung_id);
    }
  });
});
