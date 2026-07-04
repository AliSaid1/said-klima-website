import { test, expect, Page } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Cart operations: remove, quantity change, and persistence across reload.
 *
 * The cart is a localStorage-backed React context (key "kks-cart"), and the
 * /cart page renders purely from that state — no database round-trip — so we
 * seed a cart item directly. This keeps the tests deterministic and independent
 * of the catalog (unlike shop-cart.spec.ts which drives the shop UI). No keys
 * required, so these always run.
 */
const CART_KEY = 'kks-cart';
const CART_ITEM = {
  artikel_id: 'a1000000-0000-4000-8000-000000000001',
  titel: 'E2E Testklimagerät',
  artikelnummer: 'E2E-CART-001',
  preis_brutto: 899,
  rabattpreis: null,
  menge: 2,
  bild_url: null,
  mit_installation: false,
  dienstleistung_id: null,
};

async function seedCart(page: Page) {
  await page.goto(`${BASE_URL}/cart`);
  await page.evaluate(
    ([key, item]) => localStorage.setItem(key as string, JSON.stringify([item])),
    [CART_KEY, CART_ITEM] as const,
  );
  await page.reload();
  await expect(page.getByText(CART_ITEM.titel).first()).toBeVisible({ timeout: 15000 });
}

const cartMenge = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw)[0]?.menge : undefined;
  }, CART_KEY);

test.describe('Cart operations', () => {
  test('removing the only item empties the cart', async ({ page }) => {
    await seedCart(page);
    await page.getByRole('button', { name: 'Artikel entfernen' }).first().click();
    await expect(
      page.getByRole('heading', { name: /Ihr Warenkorb ist leer/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('increasing the quantity updates the persisted cart', async ({ page }) => {
    await seedCart(page);
    expect(await cartMenge(page)).toBe(2);
    await page.getByRole('button', { name: 'Menge erhöhen' }).first().click();
    await expect.poll(() => cartMenge(page), { timeout: 10000 }).toBe(3);
  });

  test('the cart survives a page reload', async ({ page }) => {
    await seedCart(page);
    // seedCart already reloaded once after seeding; reload again without
    // re-seeding to prove the app persists + rehydrates the cart itself.
    await page.reload();
    await expect(page.getByText(CART_ITEM.titel).first()).toBeVisible({ timeout: 15000 });
  });
});
