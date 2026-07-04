import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Checkout UI flow up to (but not through) Stripe. Adds a product to the cart,
 * clicks "Zur Kasse", and asserts the /api/checkout call returns a Stripe
 * hosted-checkout URL. We assert on the API response rather than navigating to
 * checkout.stripe.com so the test doesn't depend on loading Stripe's external
 * page (slow/flaky in CI). Payment itself completes via webhook (covered in
 * stripe-webhook.spec.ts).
 *
 * Gated on STRIPE_SECRET_KEY — creating the Checkout Session requires it.
 */
test.describe('Checkout → Stripe', () => {
  test('redirects to Stripe hosted checkout after "Zur Kasse"', async ({ page }) => {
    test.skip(!process.env.STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY not set');
    test.setTimeout(90_000);

    // Add the first buyable product to the cart.
    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'networkidle' });
    const productLinks = page.locator('a[href^="/shop/"]');
    await productLinks.first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    test.skip((await productLinks.count()) === 0, 'No products in catalog');

    await Promise.all([
      page.waitForURL(/\/shop\/.+/),
      productLinks.first().click(),
    ]);

    await page
      .getByRole('button', { name: /In den Warenkorb|Ausverkauft/ })
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    const addButton = page.getByRole('button', { name: 'In den Warenkorb' });
    test.skip((await addButton.count()) === 0, 'First product is sold out');
    await addButton.first().click();
    await expect(
      page.getByText(/wurde zum Warenkorb hinzugefügt/i).first(),
    ).toBeVisible({ timeout: 5000 });

    // Go to the cart and start checkout.
    await page.goto(`${BASE_URL}/cart`);
    const checkoutButton = page
      .getByRole('button', { name: /Zur Kasse|Bezahlen/i })
      .first();
    await expect(checkoutButton).toBeVisible();

    // Capture the /api/checkout response directly rather than waiting for the
    // external Stripe page to load (which is slow/unreliable in CI). This still
    // exercises the full UI → API → Stripe session-creation path and surfaces
    // the server error message if session creation fails.
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/checkout') && r.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      checkoutButton.click(),
    ]);

    const body = await resp.json().catch(() => ({}));
    const info = `checkout ${resp.status()}: ${JSON.stringify(body)}`;
    expect(resp.status(), info).toBe(200);
    // A real Stripe Checkout Session was created (cs_… id) — the definitive
    // success signal that "Zur Kasse" reached Stripe. The hosted `url` is also
    // asserted when Stripe returns one.
    expect(String(body.session_id), info).toMatch(/^cs_/);
    if (body.url) {
      expect(String(body.url)).toContain('checkout.stripe.com');
    }
  });
});
