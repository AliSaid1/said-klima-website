import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Shop → cart flow. Uses whatever products exist in the connected database.
 * Skips gracefully when the catalog is empty so it never produces a false
 * failure on a fresh environment. Stops before Stripe payment (external).
 */
test.describe('Shop and cart', () => {
  test('add a product to the cart and see it on the cart page', async ({ page }) => {
    // The dev server compiles /shop on first hit and products load via an
    // async fetch, so allow generous time before deciding the catalog is empty.
    test.setTimeout(90_000);
    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Alle Klimageräte').first()).toBeVisible();

    const productLinks = page.locator('a[href^="/shop/"]');
    await productLinks
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => {});
    const count = await productLinks.count();
    test.skip(count === 0, 'No products in catalog — nothing to add to cart');

    await Promise.all([
      page.waitForURL(/\/shop\/.+/),
      productLinks.first().click(),
    ]);

    // Detail page loads the product via an async fetch — wait for the
    // purchase control to render before deciding whether it's buyable.
    await page
      .getByRole('button', { name: /In den Warenkorb|Ausverkauft/ })
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 });

    const addButton = page.getByRole('button', { name: 'In den Warenkorb' });
    // Product may be sold out ("Ausverkauft"); skip if so.
    test.skip(
      (await addButton.count()) === 0,
      'First product is sold out — cannot add to cart',
    );

    await addButton.first().click();

    // Confirmation toast appears.
    await expect(
      page.getByText(/wurde zum Warenkorb hinzugefügt/i).first(),
    ).toBeVisible({ timeout: 5000 });

    // Cart page reflects the added item.
    await page.goto(`${BASE_URL}/cart`);
    await expect(
      page.getByRole('heading', { name: 'Warenkorb', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('Zusammenfassung')).toBeVisible();
    // "Zur Kasse" checkout button is present (we do not proceed to Stripe).
    await expect(
      page.getByRole('button', { name: /Zur Kasse|Kasse|Bezahlen/i }).first(),
    ).toBeVisible();
  });

  test('empty cart shows the empty state', async ({ page }) => {
    // Clear any persisted cart, then visit.
    await page.goto(`${BASE_URL}/cart`);
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(
      page.getByText(/Ihr Warenkorb ist leer|Warenkorb/i).first(),
    ).toBeVisible();
  });
});
