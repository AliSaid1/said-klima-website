import { test, expect } from '@playwright/test';
import { BASE_URL, adminLogin, requireAdminCreds } from './helpers/auth';

/**
 * Admin dashboard E2E — gated on TEST_EMAIL / TEST_PASSWORD.
 * Verifies login, dashboard KPIs, and navigation to the main admin sections.
 */
test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    requireAdminCreds();
    await adminLogin(page);
  });

  test('shows the dashboard with KPI cards', async ({ page }) => {
    // The dashboard is an async server component that awaits several Supabase
    // queries before rendering, which can exceed the default 5s timeout when
    // running against a remote test DB from CI.
    await expect(
      page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible({ timeout: 20000 });

    for (const label of [
      'Aktive Produkte',
      'Offene Bestellungen',
      'Anstehende Termine',
      'Umsatz (Monat)',
    ]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 20000 });
    }
  });

  test('navigates to the main admin sections', async ({ page }) => {
    const sections = ['/admin/products', '/admin/orders', '/admin/bookings'];

    for (const url of sections) {
      await page.goto(`${BASE_URL}${url}`);
      // Authenticated admin must stay on the section (not bounce to login).
      await expect(page).toHaveURL(new RegExp(url));
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error/i,
      );
    }
  });

  test('redirects unauthenticated users away from admin', async ({ browser }) => {
    // Fresh context with no session cookie.
    const context = await browser.newContext();
    const anonPage = await context.newPage();
    await anonPage.goto(`${BASE_URL}/admin`);
    await expect(anonPage).toHaveURL(/\/admin\/login/);
    await context.close();
  });
});
