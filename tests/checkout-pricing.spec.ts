import { test, expect, type APIRequestContext } from '@playwright/test';
import { BASE_URL } from './helpers/auth';
import { stripeConfigured, serviceConfigured, adminClient } from './helpers/stripe';

/**
 * Server-side pricing-integrity test for POST /api/checkout.
 *
 * This is the highest-value money-path guarantee: the checkout route must price
 * every line item from the database and completely ignore any price the client
 * supplies. Here we send a seeded article together with a bogus `preis: 1`
 * field and then read the persisted order (via the service-role client) to
 * prove the totals were computed from the DB `preis_brutto`, not the fake price.
 *
 * Requires both Stripe test secrets (a real Checkout Session is created) and the
 * Supabase service role (to inspect + clean up the order), so it is gated on
 * stripeConfigured() && serviceConfigured().
 */

/** Seeded "Daikin Sensira": 899.00 € gross, in stock. */
const ARTIKEL_ID = 'a1000000-0000-4000-8000-000000000001';
const UNIT_PRICE = 899.0;
const QTY = 2;

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

test.describe('Checkout pricing integrity', () => {
  test.beforeEach(() => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe test secrets and SUPABASE_SERVICE_ROLE_KEY required',
    );
  });

  /**
   * A checkout must ignore a client-supplied price and compute the order
   * subtotal and VAT from the database price of the article.
   */
  test('ignores client-supplied prices and totals from the DB', async ({
    request,
  }) => {
    const db = adminClient();

    const res = await postCheckout(request, {
      items: [
        // `preis: 1` is a hostile client value that MUST be ignored server-side.
        { artikel_id: ARTIKEL_ID, menge: QTY, preis: 1 },
      ],
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

      const expectedSubtotal = UNIT_PRICE * QTY; // 1798.00 — proves preis:1 was ignored
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
  });
});
