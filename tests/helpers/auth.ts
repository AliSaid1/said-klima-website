import { Page, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/** Admin credentials — must be set to run admin-gated tests. */
export const ADMIN_EMAIL = process.env.TEST_EMAIL;
export const ADMIN_PASSWORD = process.env.TEST_PASSWORD;

/** Seeded customer (rolle=kunde) credentials — for customer-account tests. */
export const CUSTOMER_EMAIL = process.env.TEST_USER_EMAIL;
export const CUSTOMER_PASSWORD = process.env.TEST_USER_PASSWORD;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * True when the browser-side Supabase Auth client can reach the project
 * (anon key + url). Needed for tests that perform a real sign-in / sign-up.
 */
export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** True when a service-role client can be created (needed to clean up test users). */
export function serviceRoleConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

/**
 * Deletes a Supabase Auth user by email using the service-role admin API.
 * Best-effort cleanup for the registration test; no-op when not found or when
 * the service role isn't configured.
 */
export async function deleteAuthUserByEmail(email: string): Promise<void> {
  if (!serviceRoleConfigured()) return;
  const admin = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin.auth.admin.listUsers();
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) await admin.auth.admin.deleteUser(user.id);
}

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
