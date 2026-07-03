import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Checkout UI flow up to (but not through) Stripe. Adds a product to the cart,
 * clicks "Zur Kasse", and asserts we are redirected to Stripe's hosted
 * checkout with the created session. Payment itself happens on Stripe and
 * completes via webhook (covered separately in stripe-webhook.spec.ts).
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

    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 }),
      checkoutButton.click(),
    ]);

    // We landed on Stripe's hosted checkout page.
    expect(page.url()).toContain('checkout.stripe.com');
  });
});
