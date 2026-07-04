import { test, expect, type APIRequestContext } from '@playwright/test';
import { BASE_URL } from './helpers/auth';
import { serviceConfigured } from './helpers/stripe';

/**
 * Public catalog API tests — the storefront's read path.
 *
 * GET /api/shop/products uses the anonymous Supabase client, so the listing and
 * filter tests always run against the seeded test catalog (8 active articles
 * from 004_seed_testdaten.sql). GET /api/products/[id] uses the service-role
 * admin client on the server; its DB-hitting cases are therefore gated on
 * serviceConfigured(), while the pre-DB UUID guard (400) always runs.
 */

/** Known-good seeded article: "Daikin Sensira", 899.00 € gross. */
const SEEDED_ID = 'a1000000-0000-4000-8000-000000000001';
/** A syntactically valid v4 UUID that is guaranteed not to exist. */
const MISSING_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

/**
 * GETs a URL and returns the parsed JSON body plus the raw response.
 *
 * @param request - Playwright's request fixture.
 * @param path    - Path (with optional query string) relative to BASE_URL.
 */
async function getJson(request: APIRequestContext, path: string) {
  const res = await request.get(`${BASE_URL}${path}`);
  return { res, body: await res.json() };
}

test.describe('Public catalog API', () => {
  /** The shop listing returns the full seeded catalog with priced articles. */
  test('lists the seeded active products', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/shop/products');
    expect(res.status()).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(8);
    for (const p of body.data) {
      expect(typeof p.titel).toBe('string');
      expect(Number(p.preis_brutto)).toBeGreaterThan(0);
    }
  });

  /** The `search` filter narrows results to matching titles/descriptions. */
  test('filters products by search term', async ({ request }) => {
    const { res, body } = await getJson(
      request,
      '/api/shop/products?search=Daikin',
    );
    expect(res.status()).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    for (const p of body.data) {
      expect(`${p.titel} ${p.beschreibung}`).toMatch(/Daikin/i);
    }
  });

  /** The `maxPreis` filter excludes products priced above the ceiling. */
  test('filters products by maximum price', async ({ request }) => {
    const { res, body } = await getJson(
      request,
      '/api/shop/products?maxPreis=900',
    );
    expect(res.status()).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    for (const p of body.data) {
      expect(Number(p.preis_brutto)).toBeLessThanOrEqual(900);
    }
  });

  /** A malformed product id is rejected before touching the database. */
  test('rejects a malformed product id (400)', async ({ request }) => {
    const { res } = await getJson(request, '/api/products/not-a-uuid');
    expect(res.status()).toBe(400);
  });

  test.describe('product detail (needs service role)', () => {
    test.beforeEach(() => {
      test.skip(!serviceConfigured(), 'SUPABASE_SERVICE_ROLE_KEY not set');
    });

    /** A valid but unknown v4 UUID yields a clean 404, not a 500. */
    test('returns 404 for a non-existent product', async ({ request }) => {
      const { res } = await getJson(request, `/api/products/${MISSING_ID}`);
      expect(res.status()).toBe(404);
    });

    /** A seeded article id returns that exact product. */
    test('returns a seeded product by id', async ({ request }) => {
      const { res, body } = await getJson(
        request,
        `/api/products/${SEEDED_ID}`,
      );
      expect(res.status()).toBe(200);
      expect(body.data.id).toBe(SEEDED_ID);
      expect(body.data.titel).toMatch(/Daikin Sensira/i);
    });
  });
});
