import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';
import {
  stripeConfigured,
  serviceConfigured,
  adminClient,
  signWebhook,
  checkoutEvent,
  paymentIntentEvent,
  seedOrder,
  seedPayment,
  deleteOrder,
  deletePayments,
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
  /** A webhook with no stripe-signature header is always rejected with 400. */
  test('rejects a request with no signature (400)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ id: 'evt_x', type: 'checkout.session.completed' }),
    });
    expect(res.status()).toBe(400);
  });

  /** A tampered/invalid signature fails verification and is rejected with 400. */
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

  /** A validly-signed but unhandled event type is acknowledged with 200 (no retries). */
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

  /** An async_payment_failed event transitions the seeded order to "fehlgeschlagen". */
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

  /**
   * A card decline fires payment_intent.payment_failed while the Checkout
   * session is still active. We record the failed attempt in zahlungsvorgaenge
   * (payment events) so staff can see why a payment didn't go through.
   */
  test('payment_intent.payment_failed records a failure event on the order', async ({ request }) => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe secrets / Supabase service role not set',
    );

    const db = adminClient();
    const order = await seedOrder(db);
    const payment = await seedPayment(db, order.id);

    try {
      const payload = paymentIntentEvent('payment_intent.payment_failed', {
        id: `pi_test_${Date.now()}`,
        amount: 11900,
        currency: 'eur',
        metadata: { bestellung_id: order.id, bestellnummer: order.bestellnummer },
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
          payment_method: { type: 'card' },
        },
      });

      const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signWebhook(payload),
        },
        data: payload,
      });
      expect(res.ok()).toBeTruthy();

      await expect
        .poll(async () => {
          const { data } = await db
            .from('zahlungsvorgaenge')
            .select('ereignis')
            .eq('zahlung_id', payment.id)
            .eq('ereignis', 'payment_intent.payment_failed');
          return data?.length ?? 0;
        }, { timeout: 15000 })
        .toBeGreaterThan(0);
    } finally {
      await deletePayments(db, order.id);
      await deleteOrder(db, order.id);
    }
  });

  /** A payment_intent.payment_failed with no order metadata must still 200 (no crash). */
  test('payment_intent.payment_failed without a bestellung_id is acknowledged (200)', async ({ request }) => {
    test.skip(!stripeConfigured(), 'STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not set');

    const payload = paymentIntentEvent('payment_intent.payment_failed', {
      id: `pi_test_${Date.now()}`,
      amount: 5000,
      currency: 'eur',
      last_payment_error: { code: 'card_declined', message: 'declined' },
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

  /** An expired Checkout session cancels a still-open order (offen → storniert). */
  test('checkout.session.expired cancels a still-open order (storniert)', async ({ request }) => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe secrets / Supabase service role not set',
    );

    const db = adminClient();
    const order = await seedOrder(db); // seeded as 'offen'

    try {
      const payload = checkoutEvent('checkout.session.expired', {
        id: `cs_test_${Date.now()}`,
        metadata: { bestellung_id: order.id, bestellnummer: order.bestellnummer },
      });

      const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signWebhook(payload),
        },
        data: payload,
      });
      expect(res.ok()).toBeTruthy();

      await expect
        .poll(async () => {
          const { data } = await db
            .from('bestellungen')
            .select('status')
            .eq('id', order.id)
            .single();
          return data?.status;
        }, { timeout: 15000 })
        .toBe('storniert');
    } finally {
      await deleteOrder(db, order.id);
    }
  });

  /** An expired session must NOT overwrite an already-paid order. */
  test('checkout.session.expired leaves an already-paid order unchanged', async ({ request }) => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe secrets / Supabase service role not set',
    );

    const db = adminClient();
    const order = await seedOrder(db);
    await db.from('bestellungen').update({ status: 'bezahlt' }).eq('id', order.id);

    try {
      const payload = checkoutEvent('checkout.session.expired', {
        id: `cs_test_${Date.now()}`,
        metadata: { bestellung_id: order.id, bestellnummer: order.bestellnummer },
      });

      const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signWebhook(payload),
        },
        data: payload,
      });
      expect(res.ok()).toBeTruthy();

      // Give the handler time to (not) act, then confirm the status is unchanged.
      await new Promise((r) => setTimeout(r, 2500));
      const { data } = await db
        .from('bestellungen')
        .select('status')
        .eq('id', order.id)
        .single();
      expect(data?.status).toBe('bezahlt');
    } finally {
      await deleteOrder(db, order.id);
    }
  });

  /** async_payment_failed with no order metadata must still 200 (no crash). */
  test('async_payment_failed without a bestellung_id is acknowledged (200)', async ({ request }) => {
    test.skip(!stripeConfigured(), 'STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not set');

    const payload = checkoutEvent('checkout.session.async_payment_failed', {
      id: `cs_test_${Date.now()}`,
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

  /**
   * Stripe re-delivers events on any non-2xx / timeout, so a repeated
   * async_payment_failed must be idempotent — the order stays 'fehlgeschlagen'
   * and both deliveries are acknowledged.
   */
  test('duplicate async_payment_failed delivery is idempotent', async ({ request }) => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe secrets / Supabase service role not set',
    );

    const db = adminClient();
    const order = await seedOrder(db);

    try {
      const send = async () => {
        const payload = checkoutEvent('checkout.session.async_payment_failed', {
          id: `cs_test_${Date.now()}`,
          metadata: { bestellung_id: order.id, bestellnummer: order.bestellnummer },
          amount_total: 11900,
          currency: 'eur',
        });
        return request.post(`${BASE_URL}/api/webhooks/stripe`, {
          headers: {
            'content-type': 'application/json',
            'stripe-signature': signWebhook(payload),
          },
          data: payload,
        });
      };

      const r1 = await send();
      const r2 = await send();
      expect(r1.ok()).toBeTruthy();
      expect(r2.ok()).toBeTruthy();

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

  /**
   * The success path: a signed checkout.session.completed for a REAL session
   * (created via /api/checkout) must transition the order off 'offen' and record
   * a payment + a 'checkout.session.completed' payment event. The handler fetches
   * the live session from Stripe, so this needs a real session id — hence we place
   * an order first. A freshly-created session is still unpaid, so the order lands
   * in 'warten_auf_zahlung' (delayed-payment branch).
   */
  test('checkout.session.completed persists the order and logs the payment event', async ({ request }) => {
    test.skip(
      !stripeConfigured() || !serviceConfigured(),
      'Stripe secrets / Supabase service role not set',
    );

    const db = adminClient();
    const CHEAP_ID = 'a1000000-0000-4000-8000-00000000000c';

    // 1) Create a real Stripe Checkout Session + order via the checkout route.
    const checkoutRes = await request.post(`${BASE_URL}/api/checkout`, {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        items: [{ artikel_id: CHEAP_ID, menge: 1 }],
        kunden_email: 'e2e-webhook@said-klima.de',
      }),
    });
    expect(checkoutRes.status()).toBe(200);
    const { session_id, bestellung_id } = await checkoutRes.json();
    expect(session_id).toBeTruthy();
    expect(bestellung_id).toBeTruthy();

    try {
      // 2) Fire a signed completed event referencing that real session.
      const payload = checkoutEvent('checkout.session.completed', {
        id: session_id,
        metadata: { bestellung_id, bestellnummer: 'BS-E2E' },
      });
      const res = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signWebhook(payload),
        },
        data: payload,
      });
      expect(res.ok()).toBeTruthy();

      // 3) The order must leave 'offen' (unpaid → warten_auf_zahlung, paid → bezahlt).
      await expect
        .poll(async () => {
          const { data } = await db
            .from('bestellungen')
            .select('status')
            .eq('id', bestellung_id)
            .single();
          return data?.status;
        }, { timeout: 15000 })
        .not.toBe('offen');

      const { data: order } = await db
        .from('bestellungen')
        .select('status')
        .eq('id', bestellung_id)
        .single();
      expect(['warten_auf_zahlung', 'bezahlt']).toContain(order?.status);

      // 4) A payment row + a completed payment event were recorded.
      const { data: zahlungen } = await db
        .from('zahlungen')
        .select('id')
        .eq('bestellung_id', bestellung_id);
      const ids = (zahlungen ?? []).map((z: { id: string }) => z.id);
      expect(ids.length).toBeGreaterThan(0);

      const { data: events } = await db
        .from('zahlungsvorgaenge')
        .select('ereignis')
        .in('zahlung_id', ids)
        .eq('ereignis', 'checkout.session.completed');
      expect((events ?? []).length).toBeGreaterThan(0);
    } finally {
      await deletePayments(db, bestellung_id);
      await db.from('bestellpositionen').delete().eq('bestellung_id', bestellung_id);
      await deleteOrder(db, bestellung_id);
    }
  });
});
