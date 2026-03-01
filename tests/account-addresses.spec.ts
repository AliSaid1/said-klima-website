import { test, expect } from '@playwright/test';

// Setup: configure baseURL and test user credentials
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const testUserEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
const testUserPassword = process.env.TEST_USER_PASSWORD || 'testPassword123';

test.describe('Account Page - Address Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and login
    await page.goto(`${baseURL}/account/login`);
    await page.fill('input[type="email"]', testUserEmail);
    await page.fill('input[type="password"]', testUserPassword);
    await page.click('button:has-text("Anmelden")');

    // Wait for redirect to account page
    await page.waitForURL(`${baseURL}/account`);
  });

  test('should display existing addresses with badges', async ({ page }) => {
    // Verify addresses section is visible
    const addressesSection = page.locator('text=Adressen');
    await expect(addressesSection).toBeVisible();

    // Check if any address exists and has badges
    const addressCards = page.locator('[class*="border-slate-200 rounded-xl p-4"]');
    if (await addressCards.count() > 0) {
      const firstCard = addressCards.first();
      // Should have edit/delete buttons
      await expect(firstCard.locator('button:has-text("Bearbeiten")')).toBeVisible();
      await expect(firstCard.locator('button:has-text("Löschen")')).toBeVisible();
    }
  });

  test('should add a new address with checkboxes', async ({ page }) => {
    // Fill in the address form
    await page.fill('input[placeholder="Musterstraße 123"]', 'Teststraße 42');
    await page.fill('input[placeholder="10115"]', '12345');
    await page.fill('input[placeholder="Berlin"]', 'Teststadt');

    // Check the "Als Lieferadresse verwenden" checkbox
    const deliveryCheckbox = page.locator('input[type="checkbox"]').first();
    await deliveryCheckbox.check();

    // Click save button
    await page.click('button:has-text("Adresse speichern")');

    // Verify success toast
    await expect(page.locator('text=Adresse hinzugefügt')).toBeVisible();

    // Verify new address appears in list with blue badge
    await expect(page.locator('text=Teststraße 42')).toBeVisible();
    await expect(page.locator('text=Lieferadresse')).toBeVisible();
  });

  test('should edit an existing address', async ({ page }) => {
    // Get the first address card
    const addressCards = page.locator('[class*="border-slate-200 rounded-xl p-4"]');
    if (await addressCards.count() === 0) {
      test.skip();
    }

    // Click edit on first address
    const editButton = addressCards.first().locator('button:has-text("Bearbeiten")');
    await editButton.click();

    // Form should now have the address data
    const streetInput = page.locator('input[placeholder="Musterstraße 123"]');
    await expect(streetInput).toHaveValue(/.+/); // Should have some value

    // Modify the street
    await streetInput.fill('Neue Teststraße 99');

    // Click update button
    await page.click('button:has-text("Aktualisieren")');

    // Verify success toast
    await expect(page.locator('text=Adresse aktualisiert')).toBeVisible();
  });

  test('should delete an address', async ({ page }) => {
    // Get the first address card
    const addressCards = page.locator('[class*="border-slate-200 rounded-xl p-4"]');
    if (await addressCards.count() === 0) {
      test.skip();
    }

    const firstAddressText = await addressCards.first().locator('p.font-medium').first().textContent();

    // Click delete on first address
    const deleteButton = addressCards.first().locator('button:has-text("Löschen")');
    await deleteButton.click();

    // Verify success toast
    await expect(page.locator('text=Adresse gelöscht')).toBeVisible();

    // Verify address is gone from list
    if (firstAddressText) {
      await expect(page.locator(`text=${firstAddressText}`)).not.toBeVisible();
    }
  });

  test('should set delivery address as default via checkbox', async ({ page }) => {
    // Skip if no addresses exist
    const addressCards = page.locator('[class*="border-slate-200 rounded-xl p-4"]');
    if (await addressCards.count() === 0) {
      test.skip();
    }

    // Click edit on first address
    const editButton = addressCards.first().locator('button:has-text("Bearbeiten")');
    await editButton.click();

    // Find and check the delivery checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const deliveryCheckbox = checkboxes.first();

    // Uncheck if already checked, then check
    const isChecked = await deliveryCheckbox.isChecked();
    if (isChecked) {
      await deliveryCheckbox.uncheck();
    }
    await deliveryCheckbox.check();

    // Save
    await page.click('button:has-text("Aktualisieren")');

    // Verify toast
    await expect(page.locator('text=Adresse aktualisiert|Lieferadresse aktualisiert')).toBeVisible();
  });

  test('should show undo action in toast after adding address', async ({ page }) => {
    // Fill in form
    await page.fill('input[placeholder="Musterstraße 123"]', 'Undo Teststraße 1');
    await page.fill('input[placeholder="10115"]', '54321');
    await page.fill('input[placeholder="Berlin"]', 'Undostadt');

    // Save
    await page.click('button:has-text("Adresse speichern")');

    // Verify toast with Rückgängig (undo) button appears
    const undoButton = page.locator('button:has-text("Rückgängig")');
    await expect(undoButton).toBeVisible({ timeout: 5000 });

    // Click undo
    await undoButton.click();

    // Verify undo success toast
    await expect(page.locator('text=Änderung rückgängig gemacht')).toBeVisible();

    // Verify address is deleted
    await expect(page.locator('text=Undo Teststraße 1')).not.toBeVisible();
  });

  test('should validate required fields on form submit', async ({ page }) => {
    // Try to save without filling in required fields
    await page.click('button:has-text("Adresse speichern")');

    // Verify error toast
    await expect(page.locator('text=Bitte Straße, PLZ und Ort ausfüllen')).toBeVisible();
  });
});

