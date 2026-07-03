# End-to-End (E2E) Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end tests.
This document describes the test suite, how to run it locally, how it runs in
CI, and the optional next steps for expanding coverage.

---

## 1. Overview

| Item | Value |
| --- | --- |
| Runner | `@playwright/test` |
| Config | [`playwright.config.ts`](../../playwright.config.ts) |
| Test dir | [`tests/`](../../tests) |
| Browsers | Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12) |
| Dev server | Auto-started by Playwright (`npm run dev` on `http://localhost:3000`) |
| Base URL | `process.env.BASE_URL` → defaults to `http://localhost:3000` |

Playwright starts the Next.js dev server automatically (`webServer` block in the
config) and reuses an already-running server locally.

---

## 2. Test suites

### `tests/helpers/auth.ts` (shared helper)
- `adminLogin(page)` — logs in through `/admin/login` and waits for `/admin`.
- `requireAdminCreds()` — skips a test when `TEST_EMAIL` / `TEST_PASSWORD` are unset.
- Exposes `BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

### `tests/public-smoke.spec.ts` — public site (no auth, no seeded data)
The baseline "the site is up" guarantee. For each public route it asserts:
- HTTP status `< 400`,
- the page did **not** fall into an error boundary,
- the key heading/content is visible.

Routes covered: `/`, `/shop`, `/services`, `/contact`, `/booking`, `/cart`,
and all legal pages (`impressum`, `datenschutz`, `agb`, `widerruf`,
`versand-zahlung`). Plus a home → shop navigation test.

### `tests/admin-dashboard.spec.ts` — admin area (gated on credentials)
Skips unless `TEST_EMAIL` / `TEST_PASSWORD` are set. Covers:
- login → dashboard renders with the 4 KPI cards,
- navigation to Produkte / Bestellungen / Termine,
- unauthenticated users are redirected to `/admin/login`.

### `tests/shop-cart.spec.ts` — shop → cart flow (gated on catalog data)
- Opens the first product, adds it to the cart, verifies the confirmation toast
  and that it appears on `/cart` with a checkout button. **Stops before Stripe**
  (external payment is not exercised).
- Skips gracefully when the catalog is empty or the first product is sold out, so
  a fresh/empty environment never produces a false failure.
- Also verifies the empty-cart state.

### Pre-existing specs (gated / opt-in)
- `tests/account-addresses.spec.ts` — customer address CRUD on `/account`.
  Skipped unless `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` are set (needs a seeded
  **customer** user with addresses; the CI seed only provisions the admin user).
- `tests/upload.spec.ts` — rich-text-editor image upload. Opt-in: set
  `RUN_UPLOAD_E2E=1` (needs Storage buckets + editor access). Skipped by default.

---

## 3. Running locally

```bash
# Install browsers once
npx playwright install --with-deps

# Run everything (all 5 browser projects)
npm test

# Faster feedback: one browser
npx playwright test --project=chromium

# A single file / single test
npx playwright test public-smoke.spec.ts --project=chromium
npx playwright test public-smoke.spec.ts:44 --project=chromium

# Interactive UI mode / debug
npm run test:ui
npm run test:debug

# Open the HTML report after a run
npx playwright show-report
```

### Environment variables
Add these to `.env.local` (see [`.env.example`](../../.env.example)). Playwright
reads them from the process environment:

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | App URL under test (default `http://localhost:3000`) |
| `TEST_EMAIL` / `TEST_PASSWORD` | Admin login — enables admin-gated tests |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | *Optional* — customer login; enables `account-addresses` |
| `RUN_UPLOAD_E2E` | *Optional* — set to `1` to run the opt-in Storage upload spec |

> Without `TEST_EMAIL` / `TEST_PASSWORD` the admin tests **skip** (not fail).

---

## 4. Latest result

Run on Chromium against the **seeded test project** (with `TEST_EMAIL` /
`TEST_PASSWORD`):

```
17 passed, 8 skipped
  - passed: 11 public smoke + home→shop nav
  - passed: 3 admin dashboard (login, section nav, auth redirect)
  - passed: 2 shop-cart (add-to-cart, empty cart)
  - skipped: 7 account-addresses (no customer user — TEST_USER_* unset)
  - skipped: 1 upload (opt-in, RUN_UPLOAD_E2E unset)
```

Without a seeded DB / admin credentials, the admin and add-to-cart tests skip
too (they never fail on a bare environment). See [CI_SETUP.md](./CI_SETUP.md)
for the seeding + secrets setup that turns them green.

---

## 5. Conventions & tips

- **Skip, don't fail, on missing prerequisites.** Gate tests that need
  credentials or seeded data with `test.skip(...)` so the suite is green on any
  environment.
- **Fixed/animated header.** The site header can intercept pointer events; use
  `scrollIntoViewIfNeeded()` + `click({ force: true })` when clicking nav links
  (see the home → shop test).
- **Duplicate links.** Desktop and mobile navs both render (e.g. two `/shop`
  links); scope with `a[href="/shop"]:visible` and `.first()`.
- **German UI text.** Assertions use the actual German copy (e.g. `Warenkorb`,
  `In den Warenkorb`, `Alle Klimageräte`).

---

## 6. Optional next steps (expanding coverage)

These are recommended enhancements, not blockers:

1. **Full checkout in Stripe test mode.** Drive the Stripe-hosted checkout with
   the `4242 4242 4242 4242` test card, then assert the order lands in
   `/admin/orders`. Requires Stripe test keys + webhook forwarding
   (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`).
2. **Public booking → admin calendar.** Complete the multi-step `/booking` form
   and verify the appointment appears in `/admin/bookings`.
3. **CMS round-trip.** Edit a content page in `/admin/content/[slug]` and assert
   the change renders on the corresponding public legal page.
4. **Settings → live theming.** Change company data / colors in
   `/admin/settings` and assert the public header/footer reflect it.
5. **Email assertions.** Use a Resend test/sandbox inbox (or mock) to assert
   order-confirmation and booking emails are sent.
6. **Accessibility & performance.** Add `@axe-core/playwright` a11y checks and a
   Lighthouse CI budget for key public pages.
7. **Visual regression.** Add `toHaveScreenshot()` snapshots for the homepage,
   shop, and admin dashboard.
8. **`outputFileTracingRoot`.** Set it in `next.config.ts` to silence the
   multiple-lockfile warning (there is a stray `C:\Users\Ali.Said\package-lock.json`).

---

## 7. Related docs

- [CI_SETUP.md](./CI_SETUP.md) — GitHub Actions workflow + test-DB seeding.
- [`playwright.config.ts`](../../playwright.config.ts) — runner configuration.
