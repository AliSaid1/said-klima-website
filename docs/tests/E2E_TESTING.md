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

Tests are grouped by **criticality** — how much a failure would hurt the business
if it shipped. A ✅ marks a test that is currently green in CI (with all secrets +
the seeded test project); ⏭️ marks an opt-in test that is intentionally skipped.

| Criticality | Suite | What breaks if it fails |
| --- | --- | --- |
| 🔴 Critical | `security.spec.ts` | Anyone could reach protected data / bypass admin auth |
| 🔴 Critical | `stripe-webhook.spec.ts` | Payments mis-recorded; orders never confirmed/failed |
| 🔴 Critical | `checkout-validation.spec.ts` | Bad/forged carts reach payment |
| 🔴 Critical | `checkout-ui.spec.ts` | Customers can't pay at all |
| 🟠 High | `admin-dashboard.spec.ts` | Staff locked out of / into the back office |
| 🟠 High | `shop-cart.spec.ts` | Customers can't build an order |
| 🟠 High | `cart-operations.spec.ts` | Cart edits/persistence broken |
| 🟠 High | `account-addresses.spec.ts` | Customers can't manage delivery addresses |
| 🟡 Medium | `public-smoke.spec.ts` | A public page is down / erroring |
| ⚪ Low | `upload.spec.ts` (opt-in) | Admin rich-text image upload |

### 🔴 Critical

**`tests/security.spec.ts` — auth & security boundaries** (always runs)
- ✅ `GET /api/orders` without a session → `401 Nicht autorisiert` (authz).
- ✅ Admin login with invalid credentials shows an error and stays on
  `/admin/login` (never reaches the dashboard) (authn).
- ✅ An unknown route returns `404` (no crash / error boundary).

**`tests/stripe-webhook.spec.ts` — Stripe webhook (`POST /api/webhooks/stripe`)**
- ✅ **Always runs:** a request with no `stripe-signature` is rejected (`400`).
- ✅ *(Stripe secrets)* a forged signature is rejected (`400`).
- ✅ *(Stripe secrets)* a correctly-signed event of an *unhandled* type
  (`payment_intent.created`) is acknowledged `200 {received:true}` — so Stripe
  doesn't retry unhandled events forever.
- ✅ *(Stripe secrets + service role)* a signed
  `checkout.session.async_payment_failed` event transitions the seeded order to
  `fehlgeschlagen` (asserted in the DB). Uses `helpers/stripe.ts` to sign events
  and seed/clean up the order via the service-role client.
- The Stripe *success* paths (`checkout.session.completed` /
  `async_payment_succeeded`) call the real Stripe API (`sessions.retrieve`), so
  they're covered by the UI-up-to-Stripe test rather than synthetic events.

**`tests/checkout-validation.spec.ts` — checkout input validation** *(service role)*
Guards the payment entry point. Every case is rejected with a `4xx` **before**
any Stripe call, so no Stripe key is needed — only the service role (the route
builds an admin client up front).
- ✅ empty cart → `400`
- ✅ more than 50 items → `400`
- ✅ a non-UUID `artikel_id` → `400` (the class of bug the v4 UUID seed fix
  addressed — see §5 gotcha)
- ✅ an invalid quantity (`menge: 0`) → `400`
- ✅ a syntactically-valid v4 UUID that isn't a real article → `400 nicht gefunden`
  (arbitrary IDs must never create a session)

**`tests/checkout-ui.spec.ts` — checkout → Stripe** *(`STRIPE_SECRET_KEY`)*
- ✅ Adds a product, clicks **"Zur Kasse"**, and asserts `POST /api/checkout`
  returns `200` with a real Stripe Checkout Session id (`cs_…`) — the definitive
  proof the UI reached Stripe. It intercepts the API response with `page.route`
  (reading the body inside the handler) so the success-navigation to Stripe can't
  wipe it, and neuters the redirect so no external page load is needed. The hosted
  `checkout.stripe.com` URL is asserted when present. Payment completes via webhook.

### 🟠 High

**`tests/admin-dashboard.spec.ts` — admin area** *(`TEST_EMAIL` / `TEST_PASSWORD`)*
- ✅ login → dashboard renders with the 4 KPI cards
- ✅ navigation to Produkte / Bestellungen / Termine
- ✅ unauthenticated users are redirected to `/admin/login`

**`tests/shop-cart.spec.ts` — shop → cart flow** *(gated on catalog data)*
- ✅ Opens the first product, adds it to the cart, verifies the confirmation toast
  and that it appears on `/cart` with a checkout button. Stops before Stripe.
- ✅ Verifies the empty-cart state.
- Skips gracefully when the catalog is empty or the first product is sold out.

**`tests/cart-operations.spec.ts` — cart edit & persistence** (always runs)
Seeds a cart item directly into `localStorage` (key `kks-cart`) so it's
deterministic and catalog-independent.
- ✅ removing the only item empties the cart
- ✅ increasing the quantity updates the persisted cart (2 → 3)
- ✅ the cart survives a page reload (rehydrates from `localStorage`)

**`tests/account-addresses.spec.ts` — customer address CRUD** *(`TEST_USER_*`)*
Runs against a seeded **customer** (`rolle=kunde`) user with two pre-seeded
addresses (provisioned by `scripts/seed-test-db.mjs`).
- ✅ shows seeded addresses with edit/delete actions
- ✅ adds a new address as delivery address
- ✅ edits an existing address
- ✅ deletes an address
- ✅ sets an address as the default delivery address
- ✅ offers an undo action after adding
- ✅ validates required fields on submit

### 🟡 Medium

**`tests/public-smoke.spec.ts` — public site** (no auth, no seeded data)
The baseline "the site is up" guarantee. For each public route it asserts the
HTTP status is `< 400`, the page didn't hit an error boundary, and the key
heading is visible. Routes: `/`, `/shop`, `/services`, `/contact`, `/booking`,
`/cart`, and all legal pages (`impressum`, `datenschutz`, `agb`, `widerruf`,
`versand-zahlung`), plus a home → shop navigation test. ✅

### ⚪ Low (opt-in)

**`tests/upload.spec.ts` — rich-text-editor image upload**
- ⏭️ Opt-in: set `RUN_UPLOAD_E2E=1` (needs Storage buckets + editor access).
  Skipped by default because it depends on Supabase Storage configuration that
  isn't part of the test-DB seed.

### Shared helpers
- `tests/helpers/auth.ts` — `adminLogin(page)`, `requireAdminCreds()`, `BASE_URL`.
- `tests/helpers/stripe.ts` — webhook signing, service-role client, order seed/cleanup.


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
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Customer login — enables `account-addresses`. In CI these are self-contained (fixed email + reused `TEST_PASSWORD`), and the seed provisions the `kunde` user. |
| `STRIPE_SECRET_KEY` | *Optional* — Stripe **test-mode** secret; enables the checkout→Stripe redirect test and webhook signature test |
| `STRIPE_WEBHOOK_SECRET` | *Optional* — webhook signing secret; enables the signed-webhook tests |
| `SUPABASE_SERVICE_ROLE_KEY` | *Optional (already set in CI)* — needed to seed an order for the `async_payment_failed` webhook test |
| `RUN_UPLOAD_E2E` | *Optional* — set to `1` to run the opt-in Storage upload spec |

> Without `TEST_EMAIL` / `TEST_PASSWORD` the admin tests **skip** (not fail).

---

## 4. Latest result

Run on Chromium against the **seeded test project** with all secrets
(`TEST_EMAIL`/`TEST_PASSWORD`, Stripe test-mode keys, `SUPABASE_SERVICE_ROLE_KEY`;
the customer `kunde` user is auto-seeded):

```
40 passed, 1 skipped
  - passed: 11 public smoke + home→shop nav
  - passed:  3 security (anon API 401, bad admin login, 404)
  - passed:  3 admin dashboard (login, section nav, auth redirect)
  - passed:  2 shop-cart (add-to-cart, empty cart)
  - passed:  3 cart-operations (remove, quantity, persistence)
  - passed:  7 account-addresses (customer address CRUD)
  - passed:  1 checkout-ui (Zur Kasse → Stripe session id)
  - passed:  4 stripe-webhook (missing-sig, forged-sig, unknown-event, async_failed)
  - passed:  5 checkout-validation (empty cart, >50 items, bad UUID, bad qty, unknown article)
  - skipped: 1 upload (opt-in, RUN_UPLOAD_E2E unset)
```

The only remaining skip is the opt-in Storage upload spec. On a bare machine
(no Stripe key, no service role, no customer creds) the payment, webhook-signed,
checkout-validation and account-address tests **skip** rather than fail. See
[CI_SETUP.md](./CI_SETUP.md) for the seeding + secrets setup that turns them green.

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
- **Seed data must use valid v4 UUIDs.** `POST /api/checkout` (and
  `/api/products/[id]`) validate `artikel_id` against a strict **v4** UUID regex
  (`…-4xxx-[89ab]xxx-…`). Production IDs come from `gen_random_uuid()` (always
  v4), but hand-written seed IDs like `a1000000-0000-0000-0000-…` are **not** v4
  and get rejected with `400 Ungültige Artikel-IDs`. The test seed
  (`004_seed_testdaten.sql`) uses `a1000000-0000-4000-8000-…` so checkout works.

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

### More scenarios & edge cases worth adding

Prioritised by value ÷ effort. Items marked ✅ CI-safe need no external service
and are deterministic against the seeded test project.

**✅ Done (implemented this round):**
- ✅ **Cart operations** — quantity change, remove line item, persistence across
  reload (`cart-operations.spec.ts`).
- ✅ **Admin login failure** — invalid credentials show an error and don't reach
  the dashboard (`security.spec.ts`).
- ✅ **Protected APIs reject anon** — `GET /api/orders` without a session → `401`
  (`security.spec.ts`).
- ✅ **404 / unknown route** — returns `404` instead of an error boundary
  (`security.spec.ts`).

**Medium value (next candidates):**
- **Pricing integrity at checkout** — seed an article with a `rabattpreis`
  discount and assert the Checkout Session line item uses the discounted price
  (proves H-5: server-side pricing). Needs `STRIPE_SECRET_KEY`.
- **Variant surcharge** — an article variant adds its `preis_aufschlag`; assert
  the session total reflects it, and that an unknown `variant_id` is ignored.
- **Booking flow** — complete the multi-step `/booking` form and assert the
  appointment persists (and later appears in `/admin/bookings`).
- **Contact form** — submit `/contact`, assert the success state (email send is
  fire-and-forget; assert the API `200`, not delivery).

**Lower value / harder in CI:**
- **Rate limiting (429)** — hammer an endpoint past its window. Flaky with the
  in-memory fallback + high limits; better as a targeted unit test.
- **Full Stripe payment** — pay with `4242…` and confirm the order flips to paid.
  Needs `stripe listen` webhook forwarding — not available in standard CI.
- **Email assertions, a11y (`@axe-core/playwright`), visual snapshots** — see the
  numbered list above.

---

## 7. Related docs

- [CI_SETUP.md](./CI_SETUP.md) — GitHub Actions workflow + test-DB seeding.
- [`playwright.config.ts`](../../playwright.config.ts) — runner configuration.
