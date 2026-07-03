import { Page, test } from '@playwright/test';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/** Admin credentials — must be set to run admin-gated tests. */
export const ADMIN_EMAIL = process.env.TEST_EMAIL;
export const ADMIN_PASSWORD = process.env.TEST_PASSWORD;

/**
 * Skips the current test if admin credentials are not configured.
 * Set TEST_EMAIL / TEST_PASSWORD in the environment (see .env.example).
 */
export function requireAdminCreds() {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'TEST_EMAIL/TEST_PASSWORD not set — skipping admin E2E test',
  );
}

/**
 * Logs in through the admin login page and waits for the dashboard.
 * Assumes requireAdminCreds() has already guarded the test.
 */
export async function adminLogin(page: Page) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input#email', ADMIN_EMAIL as string);
  await page.fill('input#password', ADMIN_PASSWORD as string);
  await Promise.all([
    page.waitForURL(`${BASE_URL}/admin`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}
