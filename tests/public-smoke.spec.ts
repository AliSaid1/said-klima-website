import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Public smoke tests — verify every public route renders without a server
 * error and shows its key content. These require no auth or seeded data and
 * are the baseline "the site is up" guarantee.
 */

const publicRoutes: { path: string; heading: string | RegExp }[] = [
  { path: '/', heading: /Said|Klima|Kälte/i },
  { path: '/shop', heading: 'Alle Klimageräte' },
  { path: '/services', heading: 'Unsere Dienstleistungen' },
  { path: '/contact', heading: 'Kontakt & Anfrage' },
  { path: '/booking', heading: 'Service-Termin buchen' },
  { path: '/cart', heading: /Warenkorb/i },
  { path: '/legal/impressum', heading: /Impressum/i },
  { path: '/legal/datenschutz', heading: /Datenschutz/i },
  { path: '/legal/agb', heading: /AGB|Allgemeine Geschäftsbedingungen/i },
  { path: '/legal/widerruf', heading: /Widerruf/i },
  { path: '/legal/versand-zahlung', heading: /Versand|Zahlung/i },
];

for (const route of publicRoutes) {
  /** Each public route responds < 400, avoids the error boundary, and shows its heading. */
  test(`public route ${route.path} renders`, async ({ page }) => {
    const response = await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response, `no response for ${route.path}`).not.toBeNull();
    expect(response!.status(), `bad status for ${route.path}`).toBeLessThan(400);

    // Page must not have crashed into the error boundary.
    await expect(page.locator('body')).not.toContainText(
      /Application error|Internal Server Error|Unhandled Runtime Error/i,
    );

    // Key content is present.
    await expect(
      page.getByText(route.heading).first(),
    ).toBeVisible({ timeout: 10000 });
  });
}

/** The homepage's shop link navigates to /shop and loads the catalog page. */
test('home has working navigation to the shop', async ({ page }) => {
  await page.goto(`${BASE_URL}/`);
  const shopLink = page.locator('a[href="/shop"]:visible').first();
  await expect(shopLink).toBeVisible();
  // Force the click: the fixed/animated header can intercept normal pointer events.
  await shopLink.scrollIntoViewIfNeeded();
  await shopLink.click({ force: true });
  await expect(page).toHaveURL(/\/shop/, { timeout: 15000 });
  await expect(page.getByText('Alle Klimageräte').first()).toBeVisible({ timeout: 15000 });
});
