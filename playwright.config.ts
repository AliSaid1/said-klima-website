import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

/**
 * Load env files so gated tests (admin/customer/Stripe) pick up credentials on a
 * dev machine. dotenv does NOT override variables already present in the
 * environment, and the FIRST file to define a var wins, so precedence is:
 *
 *   1. real environment (CI GitHub Actions secrets)      ← always authoritative
 *   2. .env.e2e.local   (dedicated TEST-project creds)    ← use this for E2E
 *   3. .env.local       (your normal dev creds)
 *   4. .env
 *
 * IMPORTANT: `.env.local` on this machine points at the PRODUCTION Supabase
 * project. Running E2E against it would create/delete real data (and
 * `npm run seed:test` would WIPE it). Create `.env.e2e.local` from
 * `.env.e2e.local.example` with your dedicated TEST project's credentials so the
 * test runner AND the dev server it spawns both talk to the test database.
 */
loadEnv({ path: '.env.e2e.local' });
loadEnv({ path: '.env.local' });
loadEnv();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `npm run dev -- -p ${process.env.PORT || 3000}`,
    url: `http://localhost:${process.env.PORT || 3000}`,
    reuseExistingServer: !process.env.CI,
  },
});

