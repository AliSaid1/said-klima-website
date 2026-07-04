import { test, expect, type APIRequestContext } from '@playwright/test';
import { BASE_URL } from './helpers/auth';
import { serviceConfigured, adminClient } from './helpers/stripe';

/**
 * API tests for the booking flow (POST/GET /api/bookings) — the "Termin buchen"
 * feature that turns visitors into scheduled service appointments.
 *
 * Validation cases (missing service, missing time) reject with 400 before any
 * DB write and always run. The happy path creates a real booking row, so it is
 * gated on serviceConfigured() and cleans up the row it creates via the
 * service-role client to keep re-runs idempotent.
 */

/** Seeded "Wartung" service (004_seed_testdaten.sql), used for happy-path bookings. */
const SERVICE_ID = 'd1000000-0000-0000-0000-000000000002';

/**
 * POSTs a JSON body to the bookings endpoint.
 *
 * @param request - Playwright's request fixture.
 * @param body    - The booking payload.
 */
async function postBooking(request: APIRequestContext, body: unknown) {
  return request.post(`${BASE_URL}/api/bookings`, {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify(body),
  });
}

/**
 * Builds a valid future time window for a booking.
 *
 * @returns ISO strings for a 90-minute slot one week from now.
 */
function futureSlot() {
  const von = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const bis = new Date(von.getTime() + 90 * 60 * 1000);
  return { geplant_von: von.toISOString(), geplant_bis: bis.toISOString() };
}

test.describe('Bookings API', () => {
  /** A booking with no service selected must be rejected. */
  test('rejects a booking with no service (400)', async ({ request }) => {
    const res = await postBooking(request, { ...futureSlot() });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Dienstleistung/i);
  });

  /** A booking with a service but no time window must be rejected. */
  test('rejects a booking with no time window (400)', async ({ request }) => {
    const res = await postBooking(request, { dienstleistung_id: SERVICE_ID });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Zeit/i);
  });

  test.describe('happy path (needs service role)', () => {
    test.beforeEach(() => {
      test.skip(!serviceConfigured(), 'SUPABASE_SERVICE_ROLE_KEY not set');
    });

    /**
     * A complete guest booking is created (201), is retrievable by contact
     * e-mail through GET, and is then removed to keep the test project clean.
     */
    test('creates a booking and returns it by contact e-mail', async ({
      request,
    }) => {
      const email = `e2e-booking+${Date.now()}@said-klima.de`;
      const db = adminClient();

      const res = await postBooking(request, {
        dienstleistung_id: SERVICE_ID,
        ...futureSlot(),
        kontakt: { vorname: 'E2E', nachname: 'Kunde', email, telefon: '+49 30 123456' },
        hinweise: 'Automated E2E booking test',
      });

      expect(res.status()).toBe(201);
      const created = (await res.json()).data;
      expect(created.id).toBeTruthy();
      expect(String(created.booking_number)).toMatch(/^BK-/);

      try {
        const getRes = await request.get(
          `${BASE_URL}/api/bookings?email=${encodeURIComponent(email)}`,
        );
        expect(getRes.status()).toBe(200);
        const list = (await getRes.json()).data as Array<{ id: string }>;
        expect(list.some((b) => b.id === created.id)).toBe(true);
      } finally {
        await db.from('buchung_dienstleistungen').delete().eq('buchung_id', created.id);
        await db.from('buchungen').delete().eq('id', created.id);
      }
    });
  });
});
