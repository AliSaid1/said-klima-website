import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';
import {
  stripeConfigured,
  serviceConfigured,
  adminClient,
  signWebhook,
  checkoutEvent,
  seedOrder,
  deleteOrder,
} from './helpers/stripe';

/**
 * Stripe webhook integration tests — POST /api/webhooks/stripe.
 *
 * Signature verification is exercised without any secrets (missing signature
 * must always be rejected). The signed-event tests are gated on the Stripe
 * test secrets (+ Supabase service role for seeding an order) and skip when
 * those aren't configured, so the suite never produces false failures.
 */
test.describe('Stripe webhook', () => {
  test('rejects a request with no signature (400)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed' }),
    });
    expect(res.status()).toBe(400);
  });

  test('rejects a forged/invalid signature (400)', async ({ request }) => {
    test.skip(!stripeConfigured(), 'STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not set');

    const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=123,v1=deadbeef',
      },
      data: JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed' }),
    });
    expect(res.status()).toBe(400);
  });

  test('accepts a signed event of an unhandled type without side effects (200)', async ({ request }) => {
    test.skip(!stripeConfigured(), 'STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not set');

    // A correctly-signed event whose type we don't handle must still be
    // acknowledged with 200 so Stripe doesn't retry it forever.
    const payload = checkoutEvent('payment_intent.created', {
      id: `pi_test_${Date.now()}`,
    });
    const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signWebhook(payload),
      },
      data: payload,
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).received).toBe(true);
  });

  test('async_payment_failed marks the order as fehlgeschlagen', async ({ request }) => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe secrets / Supabase service role not set',
    );

    const db = adminClient();
    const order = await seedOrder(db);

    try {
      const payload = checkoutEvent('checkout.session.async_payment_failed', {
        id: `cs_test_${Date.now()}`,
        metadata: { bestellung_id: order.id, bestellnummer: order.bestellnummer },
        customer_email: 'e2e-payment@said-klima.de',
        amount_total: 11900,
        currency: 'eur',
      });

      const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signWebhook(payload),
        },
        data: payload,
      });
      expect(res.ok()).toBeTruthy();

      // The handler updates the order status via the service-role client.
      await expect
        .poll(async () => {
          const { data } = await db
            .from('bestellungen')
            .select('status')
            .eq('id', order.id)
            .single();
          return data?.status;
        }, { timeout: 15000 })
        .toBe('fehlgeschlagen');
    } finally {
      await deleteOrder(db, order.id);
    }
  });
});
