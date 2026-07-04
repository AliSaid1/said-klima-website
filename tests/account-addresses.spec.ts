import { test, expect, Page } from '@playwright/test';

/**
 * Customer account → address management (CRUD) E2E.
 *
 * Needs a seeded *customer* (rolle=kunde) user with a couple of addresses. In CI
 * that user is provisioned by scripts/seed-test-db.mjs from TEST_USER_EMAIL /
 * TEST_USER_PASSWORD; the tests skip when those are unset so the suite stays
 * green on a bare environment.
 *
 * Notes on the page under test (app/account/page.tsx):
 *  - The customer login page redirects to "/" (not /account) on success, so we
 *    wait for the confirmation toast then navigate to /account explicitly.
 *  - The default "profile" tab renders the Adressen section + the add/edit form.
 *  - The street/PLZ/Ort inputs are matched by placeholder; the Ort and Bundesland
 *    inputs share the "Berlin" placeholder, so Ort is selected with .first().
 */
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const testUserEmail = process.env.TEST_USER_EMAIL;
const testUserPassword = process.env.TEST_USER_PASSWORD;

const ADDRESS_CARD = '[class*="border-slate-200 rounded-xl p-4"]';

/**
 * Fills the address add/edit form. Only the provided fields are touched.
 *
 * @param page - The authenticated /account page.
 * @param opts - Optional field values; `lieferadresse` ticks the delivery-address checkbox.
 */
async function fillAddressForm(
  page: Page,
  opts: { strasse?: string; plz?: string; ort?: string; lieferadresse?: boolean } = {},
) {
  if (opts.strasse !== undefined)
    await page.locator('input[placeholder="Musterstraße 123"]').fill(opts.strasse);
  if (opts.plz !== undefined)
    await page.locator('input[placeholder="10115"]').fill(opts.plz);
  if (opts.ort !== undefined)
    await page.locator('input[placeholder="Berlin"]').first().fill(opts.ort);
  if (opts.lieferadresse) await page.locator('input[type="checkbox"]').first().check();
}

test.describe('Account → Address management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !testUserEmail || !testUserPassword,
      'TEST_USER_EMAIL/TEST_USER_PASSWORD not set — customer account E2E skipped',
    );
    await page.goto(`${baseURL}/account/login`);
    await page.fill('input[type="email"]', testUserEmail as string);
    await page.fill('input[type="password"]', testUserPassword as string);
    await page.click('button:has-text("Anmelden")');

    // Login redirects to "/" and shows a toast; then open the account page.
    await expect(page.getByText(/Erfolgreich angemeldet/i).first()).toBeVisible({ timeout: 15000 });
    await page.goto(`${baseURL}/account`);
    await expect(page.getByRole('heading', { name: 'Adressen' })).toBeVisible({ timeout: 15000 });
  });

  /** Seeded addresses render as cards, each exposing Bearbeiten/Löschen actions. */
  test('shows seeded addresses with edit/delete actions', async ({ page }) => {
    const cards = page.locator(ADDRESS_CARD);
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
    await expect(cards.first().getByRole('button', { name: 'Löschen' })).toBeVisible();
  });

  /** Submitting the form adds a new address and shows the success toast. */
  test('adds a new address as delivery address', async ({ page }) => {
    await fillAddressForm(page, {
      strasse: 'Teststraße 42',
      plz: '12345',
      ort: 'Teststadt',
      lieferadresse: true,
    });
    await page.getByRole('button', { name: 'Adresse speichern' }).click();

    await expect(page.getByText(/Adresse hinzugefügt/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Teststraße 42').first()).toBeVisible();
  });

  /** Editing an address's street and saving shows the "aktualisiert" toast. */
  test('edits an existing address', async ({ page }) => {
    const cards = page.locator(ADDRESS_CARD);
    await cards.first().getByRole('button', { name: 'Bearbeiten' }).click();

    const streetInput = page.locator('input[placeholder="Musterstraße 123"]');
    await expect(streetInput).toHaveValue(/.+/);
    await streetInput.fill('Neue Teststraße 99');
    await page.getByRole('button', { name: 'Aktualisieren' }).click();

    await expect(page.getByText(/Adresse aktualisiert/i).first()).toBeVisible({ timeout: 8000 });
  });

  /** Deleting an address removes its card and reduces the card count by one. */
  test('deletes an address', async ({ page }) => {
    const cards = page.locator(ADDRESS_CARD);
    const before = await cards.count();
    await cards.first().getByRole('button', { name: 'Löschen' }).click();

    await expect(page.getByText(/Adresse gelöscht/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator(ADDRESS_CARD)).toHaveCount(before - 1);
  });

  /** Marking an address as default delivery persists via the update flow. */
  test('sets an address as the default delivery address', async ({ page }) => {
    const cards = page.locator(ADDRESS_CARD);
    await cards.first().getByRole('button', { name: 'Bearbeiten' }).click();

    const deliveryCheckbox = page.locator('input[type="checkbox"]').first();
    if (await deliveryCheckbox.isChecked()) await deliveryCheckbox.uncheck();
    await deliveryCheckbox.check();
    await page.getByRole('button', { name: 'Aktualisieren' }).click();

    await expect(
      page.getByText(/Adresse aktualisiert|Lieferadresse aktualisiert/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });

  /** After adding an address the toast offers a working "Rückgängig" undo that removes it again. */
  test('offers an undo action after adding an address', async ({ page }) => {
    // Unique street per run so the assertions can't be confused by addresses
    // left behind from earlier runs against the shared test database.
    const street = `Undo Teststraße ${Date.now()}`;
    await fillAddressForm(page, { strasse: street, plz: '54321', ort: 'Undostadt' });
    await page.getByRole('button', { name: 'Adresse speichern' }).click();

    // The new address is persisted and rendered before we undo it.
    await expect(page.getByText(street).first()).toBeVisible({ timeout: 8000 });

    const undo = page.getByRole('button', { name: 'Rückgängig' }).first();
    await expect(undo).toBeVisible({ timeout: 8000 });
    await undo.click();

    // Undo reverses the add: the address card is gone again. Asserting the
    // end-state is more robust than racing the transient confirmation toast.
    await expect(page.getByText(street)).toHaveCount(0, { timeout: 8000 });
  });

  /** Submitting an empty form surfaces the required-fields validation message. */
  test('validates required fields on submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Adresse speichern' }).click();
    await expect(
      page.getByText(/Bitte Straße, PLZ und Ort ausfüllen/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});
