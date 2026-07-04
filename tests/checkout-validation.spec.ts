import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';
import { serviceConfigured } from './helpers/stripe';

/**
 * Input-validation edge cases for POST /api/checkout.
 *
 * These guard the payment entry point: every branch here rejects the request
 * with a 4xx *before* any Stripe API call, so they need no Stripe secret — only
 * the Supabase service role, because the route constructs an admin client up
 * front (createAdminClient throws without SUPABASE_SERVICE_ROLE_KEY). Gated on
 * serviceConfigured() so the suite skips cleanly on machines without that key.
 *
 * A valid v4 UUID that isn't in the catalog is used to prove the "unknown
 * article" path — arbitrary IDs must never create a Checkout Session.
 */
const NONEXISTENT_UUID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

async function postCheckout(request: any, body: unknown) {
  return request.post(`${BASE_URL}/api/checkout`, {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify(body),
  });
}

test.describe('Checkout validation', () => {
  test.beforeEach(() => {
    test.skip(!serviceConfigured(), 'SUPABASE_SERVICE_ROLE_KEY not set');
  });

  test('rejects an empty cart (400)', async ({ request }) => {
    const res = await postCheckout(request, { items: [] });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Warenkorb ist leer/i);
  });

  test('rejects more than 50 items (400)', async ({ request }) => {
    const items = Array.from({ length: 51 }, () => ({
      artikel_id: NONEXISTENT_UUID,
      menge: 1,
    }));
    const res = await postCheckout(request, { items });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Zu viele Artikel/i);
  });

  test('rejects a non-UUID artikel_id (400)', async ({ request }) => {
    const res = await postCheckout(request, {
      items: [{ artikel_id: 'not-a-uuid', menge: 1 }],
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Artikel-IDs/i);
  });

  test('rejects an invalid quantity (400)', async ({ request }) => {
    const res = await postCheckout(request, {
      items: [{ artikel_id: NONEXISTENT_UUID, menge: 0 }],
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Mengenangaben/i);
  });

  test('rejects a valid-looking UUID that is not a real article (400)', async ({
    request,
  }) => {
    const res = await postCheckout(request, {
      items: [{ artikel_id: NONEXISTENT_UUID, menge: 1 }],
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/nicht gefunden/i);
  });
});
