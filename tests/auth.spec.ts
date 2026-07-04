import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  CUSTOMER_EMAIL,
  CUSTOMER_PASSWORD,
  supabaseConfigured,
  serviceRoleConfigured,
  deleteAuthUserByEmail,
} from './helpers/auth';

/**
 * Authentication flows E2E — customer login (/account/login) and registration
 * (/account/register). Both pages talk to Supabase Auth from the browser.
 *
 * Gating:
 *  - Pure-UI assertions (links, fields, client-side password-mismatch) run
 *    everywhere.
 *  - The wrong-credentials test needs the Supabase anon client reachable
 *    (supabaseConfigured) but no seeded user.
 *  - The successful-login test needs the seeded customer (TEST_USER_*).
 *  - The successful-registration test creates a throwaway user and needs the
 *    service role to delete it afterwards.
 *
 * Note: the email/password inputs are `required`, so the browser's native
 * validation blocks an empty submit before the handler's own "please fill in"
 * toast can fire — that branch is intentionally not asserted here.
 */
test.describe('Account login', () => {
  test('renders the login form with register + reset links', async ({ page }) => {
    await page.goto(`${BASE_URL}/account/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Jetzt registrieren/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Passwort vergessen/i })).toBeVisible();
  });

  test('rejects wrong credentials with an error toast', async ({ page }) => {
    test.skip(!supabaseConfigured(), 'Supabase anon not configured — skipping real auth call');
    await page.goto(`${BASE_URL}/account/login`);
    await page.fill('input[type="email"]', `no-such-user-${Date.now()}@said-klima.de`);
    await page.fill('input[type="password"]', 'DefinitelyWrong123');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(
      page.getByText(/Anmeldung fehlgeschlagen|Zugangsdaten/i).first(),
    ).toBeVisible({ timeout: 15000 });
    // Failed login must not navigate away from the login page.
    await expect(page).toHaveURL(/\/account\/login/);
  });

  test('logs the seeded customer in and redirects home', async ({ page }) => {
    test.skip(
      !CUSTOMER_EMAIL || !CUSTOMER_PASSWORD,
      'TEST_USER_EMAIL/TEST_USER_PASSWORD not set — skipping successful-login test',
    );
    await page.goto(`${BASE_URL}/account/login`);
    await page.fill('input[type="email"]', CUSTOMER_EMAIL as string);
    await page.fill('input[type="password"]', CUSTOMER_PASSWORD as string);
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page.getByText(/Erfolgreich angemeldet/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 15000 });
  });
});

test.describe('Account registration', () => {
  test('renders the registration form with a link back to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/account/register`);
    await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Konto erstellen' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Anmelden' })).toBeVisible();
  });

  test('rejects mismatched passwords before any network call', async ({ page }) => {
    await page.goto(`${BASE_URL}/account/register`);
    await page.locator('input[placeholder="Max"]').fill('Max');
    await page.locator('input[placeholder="Mustermann"]').fill('Mustermann');
    await page.locator('input[type="email"]').fill(`e2e-mismatch-${Date.now()}@said-klima.de`);
    await page.locator('input[placeholder="Mind. 6 Zeichen"]').fill('abcdef');
    // Confirmation input shares the dotted placeholder; it's the only password
    // field of type=password without the "Mind." placeholder.
    await page.locator('input[type="password"][placeholder="••••••••"]').fill('different1');
    await page.getByRole('button', { name: 'Konto erstellen' }).click();

    await expect(
      page.getByText(/Passwörter stimmen nicht überein/i).first(),
    ).toBeVisible({ timeout: 8000 });
    // Still on the form (no success screen).
    await expect(page.getByRole('heading', { name: 'Fast geschafft!' })).toHaveCount(0);
  });

  test('registers a new user and shows the confirm-email screen', async ({ page }) => {
    test.skip(!supabaseConfigured(), 'Supabase anon not configured — skipping real sign-up');
    test.skip(!serviceRoleConfigured(), 'Service role not set — cannot clean up created user');

    const email = `e2e-signup-${Date.now()}@said-klima.de`;
    try {
      await page.goto(`${BASE_URL}/account/register`);
      await page.locator('input[placeholder="Max"]').fill('E2E');
      await page.locator('input[placeholder="Mustermann"]').fill('Signup');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[placeholder="Mind. 6 Zeichen"]').fill('Test1234');
      await page.locator('input[type="password"][placeholder="••••••••"]').fill('Test1234');
      await page.getByRole('button', { name: 'Konto erstellen' }).click();

      await expect(page.getByRole('heading', { name: 'Fast geschafft!' })).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText(email).first()).toBeVisible();
    } finally {
      await deleteAuthUserByEmail(email);
    }
  });
});
