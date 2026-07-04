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

    // Intercept the /api/checkout POST and read its body *inside* the route
    // handler (via route.fetch()). This is immune to the page navigating away:
    // on success the app sets window.location.href to the Stripe URL, which
    // would otherwise destroy the fetch response before we can read it (that
    // race made the body come back empty). We then fulfill with the URL removed
    // so the browser doesn't navigate to the slow external Stripe page — we've
    // already captured the definitive result.
    let apiStatus = 0;
    let apiBody: any = null;
    await page.route('**/api/checkout', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch();
      apiStatus = response.status();
      apiBody = await response.json().catch(() => ({}));
      await route.fulfill({
        response,
        contentType: 'application/json',
        body: JSON.stringify({ ...apiBody, url: undefined }),
      });
    });

    await checkoutButton.click();

    await expect
      .poll(() => apiStatus, { timeout: 30_000 })
      .toBeGreaterThan(0);
    const info = `checkout ${apiStatus}: ${JSON.stringify(apiBody)}`;
    expect(apiStatus, info).toBe(200);
    // A real Stripe Checkout Session was created (cs_… id) — the definitive
    // success signal that "Zur Kasse" reached Stripe. The hosted `url` is also
    // asserted when Stripe returns one.
    expect(String(apiBody?.session_id), info).toMatch(/^cs_/);
    if (apiBody?.url) {
      expect(String(apiBody.url)).toContain('checkout.stripe.com');
    }
  });
});
