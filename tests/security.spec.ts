import { test, expect } from '@playwright/test';
import { BASE_URL } from './helpers/auth';

/**
 * Security / auth boundaries — the highest-criticality guarantees:
 *  - protected APIs reject anonymous callers (authz),
 *  - bad admin credentials are rejected and don't grant access (authn),
 *  - unknown routes render a 404 rather than crashing.
 *
 * All are deterministic and need no secrets, so they always run.
 */
test.describe('Security boundaries', () => {
  /** GET /api/orders without a session returns 401 (authorization boundary). */
  test('protected API rejects anonymous requests (401)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/orders`);
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toMatch(/autorisiert/i);
  });

  /** Wrong admin credentials show an error and never reach the dashboard. */
  test('admin login rejects invalid credentials and stays on the login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    await page.fill('input#email', 'nobody@said-klima.de');
    await page.fill('input#password', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // An error is shown and we are NOT navigated into the dashboard.
    await expect(page.getByText(/falsch|fehlgeschlagen|Fehler/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  /** An unknown path returns a 404 status rather than crashing the app. */
  test('unknown route returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/diese-seite-gibt-es-nicht-${Date.now()}`);
    expect(res?.status()).toBe(404);
  });
});
