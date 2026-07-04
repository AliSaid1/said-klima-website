import { test, expect } from '@playwright/test';
import path from 'path';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const fixturePath = path.resolve(__dirname, 'fixtures', 'sample.png');

// This test drives the rich-text editor image upload through the UI. It needs a
// logged-in session that can reach /admin/content and a working Storage bucket,
// so it is opt-in: set RUN_UPLOAD_E2E=1 (plus TEST_EMAIL/TEST_PASSWORD) to run it.

test.describe('Editor image upload (UI)', () => {
  /**
   * Logs in, opens the rich-text editor, uploads an image via the dynamic file
   * input, and verifies the returned public URL is reachable. Opt-in only.
   */
  test('login, open editor, upload image, verify public URL', async ({ page }) => {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;
    test.skip(
      process.env.RUN_UPLOAD_E2E !== '1' || !email || !password,
      'Storage upload E2E is opt-in — set RUN_UPLOAD_E2E=1 with TEST_EMAIL/TEST_PASSWORD',
    );

    // Go to login and sign in
    await page.goto(`${baseURL}/account/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await Promise.all([
      page.waitForNavigation({ url: `${baseURL}/account`, waitUntil: 'networkidle' }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    // Navigate to admin content AGB editor
    await page.goto(`${baseURL}/admin/content/agb`);

    // Wait for editor to be present
    await page.waitForSelector('div.rte-content, .ProseMirror', { timeout: 5000 });

    // Click the editor's image button which creates a dynamic file input, then attach file
    await page.click('[data-rte-image-button="true"]');
    // Wait for a new file input to appear (the editor creates it dynamically)
    const fileInput = await page.waitForSelector('input[type=file]', { timeout: 5000 });
    await fileInput.setInputFiles(fixturePath);

    // Wait for the upload API response and validate it
    const uploadResp = await page.waitForResponse((r) => r.url().includes('/api/upload') && r.request().method() === 'POST', { timeout: 10000 }).catch(() => null);
    expect(uploadResp, 'Upload request did not happen').not.toBeNull();
    const uploadJson = uploadResp ? await uploadResp.json().catch(() => null) : null;
    expect(uploadJson && uploadJson.data && uploadJson.data.url, 'upload response missing data.url').toBeTruthy();

    // Wait for an <img> to appear inside the editor (timeout if insertion failed)
    const imgHandle = await page.waitForSelector('div.rte-content img', { timeout: 7000 }).catch(() => null);
    expect(imgHandle, 'No <img> found inside editor after upload').not.toBeNull();
    if (!imgHandle) return; // defensive

    const src = await imgHandle.getAttribute('src');
    expect(src, 'Uploaded image src missing').toBeTruthy();
    if (!src) throw new Error('Uploaded image src missing');

    // Ensure src is absolute URL; if relative, prefix baseURL
    const absolute = src.startsWith('http') ? src : new URL(src, baseURL).toString();

    // Verify the URL returned is accessible
    const resp = await page.request.get(absolute);
    expect([200, 201, 302]).toContain(resp.status());
  });
});


