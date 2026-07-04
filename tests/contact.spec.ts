import { test, expect, type APIRequestContext } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Input-validation tests for POST /api/contact — the public contact / Anfrage
 * form that is the site's primary lead channel.
 *
 * Only the validation branches are exercised here: each one rejects the request
 * with a 400 *before* any email (Resend) call, so these tests need no secrets
 * and always run. The happy path (200) is intentionally excluded because it
 * would send real email through Resend and is covered by manual testing.
 *
 * German error strings are asserted with umlaut-free substrings to stay robust
 * against the known double-encoding (mojibake) in some server responses.
 */

/**
 * Generates a random private-range IPv4 address.
 *
 * The contact endpoint rate-limits by client IP (5 requests / 10 min), checking
 * the limit *before* body validation. Without a unique IP per request, the
 * validation tests would share one bucket — and because the limiter can persist
 * in Redis across CI runs, frequent pushes would trip the limit and return 429
 * instead of the expected 400. A fresh IP per request keeps each test isolated.
 */
function randomIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

/**
 * POSTs a JSON body to the contact endpoint.
 *
 * @param request - Playwright's request fixture (bypasses the browser).
 * @param body    - The payload; may be a string to simulate malformed JSON.
 * @returns The raw API response for status/body assertions.
 */
async function postContact(request: APIRequestContext, body: unknown) {
  return request.post(`${BASE_URL}/api/contact`, {
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': randomIp(),
    },
    data: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test.describe('Contact form validation', () => {
  /** A malformed JSON body must be rejected with 400, never a 500. */
  test('rejects a malformed JSON body (400)', async ({ request }) => {
    const res = await postContact(request, '{ this is not json');
    expect(res.status()).toBe(400);
  });

  /** Missing mandatory fields (Vorname/Nachname/E-Mail) must be rejected. */
  test('rejects missing required fields (400)', async ({ request }) => {
    const res = await postContact(request, { nachricht: 'Hallo' });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Pflichtfelder/i);
  });

  /** A syntactically invalid e-mail address must be rejected. */
  test('rejects an invalid e-mail address (400)', async ({ request }) => {
    const res = await postContact(request, {
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'not-an-email',
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/E-Mail-Adresse/i);
  });
});
