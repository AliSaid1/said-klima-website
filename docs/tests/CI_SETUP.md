# CI Setup — E2E Tests & Test-DB Seeding

This describes the one-time setup that lets the
[`.github/workflows/e2e.yml`](../../.github/workflows/e2e.yml) workflow run the
full Playwright suite (including the admin- and catalog-gated tests) on every
push / PR to `main`.

---

## 1. What the workflow does

```
checkout → setup Node 20 → npm ci → install Playwright browsers
        → npm run seed:test              (schema + test data + admin user)
        → npm run build                  (compile gate)
        → npx playwright test --project=chromium
        → upload HTML report artifact
```

The seeding step ([`scripts/seed-test-db.mjs`](../../scripts/seed-test-db.mjs)) is
deterministic and idempotent. It:

1. **Resets** the `public` schema (drop → recreate → re-grant) so every run
   starts from a known-clean state.
2. Applies the committed baseline schema
   [`supabase/test-baseline.sql`](../../supabase/test-baseline.sql) — a faithful
   snapshot of the live German schema (25 tables, enums, constraints, indexes,
   RLS policies, functions & triggers). See the note in §4 on why this exists
   instead of the older `001…025` migrations.
3. Loads the German test catalog
   [`supabase/migrations/004_seed_testdaten.sql`](../../supabase/migrations/004_seed_testdaten.sql)
   (brands, categories, 8 products **with stock**, services, technicians,
   company settings, content pages). The stock is what makes the **add-to-cart**
   test run instead of skip.
4. Creates/resets the **admin test user** from `TEST_EMAIL` / `TEST_PASSWORD`
   (email pre-confirmed) and promotes it to `rolle='admin'` in
   `public.benutzer` (the signup trigger defaults new users to `kunde`).
5. Issues `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the freshly
   applied schema immediately (embedded FK selects otherwise 500 on a stale
   cache).

### Regenerating the baseline

The baseline only needs regenerating when the **live** schema changes:

```bash
GENERATE_ONLY=1 OUTPUT_FILE=supabase/test-baseline.sql \
  SOURCE_REF=<live-project-ref> SUPABASE_ACCESS_TOKEN=<pat> \
  node scripts/clone-schema.mjs
```

This reads the live project **read-only** and rewrites the committed file; it
does not touch any database.

---

## 2. One-time setup

### Step A — Create a dedicated Supabase **test** project
> ⚠️ Never point CI at production. Use a separate project so the schema reset and
> test data cannot touch real data.

1. Create a new project at <https://supabase.com/dashboard>.
2. From **Project Settings → API**, copy the Project URL, `anon` key and
   `service_role` key.
3. Generate a personal access token at
   <https://supabase.com/dashboard/account/tokens> (used by the Management API to
   apply migrations).
4. Create the storage buckets used by uploads: `product-images`, `cms-media`,
   `logos` (public).

### Step B — Add GitHub Actions secrets
Repository → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Test project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Test project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Test project service-role key |
| `SUPABASE_ACCESS_TOKEN` | Personal access token (Management API) |
| `STRIPE_SECRET_KEY` | Stripe **test** secret key (`sk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe **test** publishable key (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe test webhook secret (`whsec_...`) |
| `RESEND_API_KEY` | Resend API key (or a sandbox key) |
| `UPSTASH_REDIS_REST_URL` | Optional — rate limiting no-ops if unset |
| `UPSTASH_REDIS_REST_TOKEN` | Optional |
| `CRON_SECRET` | Any long random string |
| `TEST_EMAIL` | Admin login for E2E (e.g. `e2e-admin@said-klima.de`) |
| `TEST_PASSWORD` | Admin password (≥ 6 chars) |
| `TEST_USER_EMAIL` | *Optional* — customer login; enables the `account-addresses` spec (skipped if unset) |
| `TEST_USER_PASSWORD` | *Optional* — customer password |

`NEXT_PUBLIC_APP_URL`, `BASE_URL` are hard-coded to `http://localhost:3000` in
the workflow and do not need secrets.

> **Storage buckets** are only needed for the opt-in `upload` spec
> (`RUN_UPLOAD_E2E=1`), which is skipped by default. Create them if you enable it.

---

## 3. Running the seeder locally

```bash
# Provide the TEST project values via the environment, then:
NODE_TLS_REJECT_UNAUTHORIZED=0 \
NEXT_PUBLIC_SUPABASE_URL=https://<test-ref>.supabase.co \
SUPABASE_ACCESS_TOKEN=<pat> \
SUPABASE_SERVICE_ROLE_KEY=<test-secret-key> \
TEST_EMAIL=e2e-admin@said-klima.de TEST_PASSWORD=E2eKlima!Test2026 \
  node scripts/seed-test-db.mjs
```

> ⚠️ The seeder **wipes `public`** on the target project. Only ever point it at a
> dedicated test project. Set `RESET_SCHEMA=0` to skip the reset (re-seed onto an
> existing schema — data inserts are guarded with `ON CONFLICT`).

The script is **idempotent** — safe to re-run; it rebuilds the schema from the
committed baseline and resets the admin user's password each time.

---

## 4. Notes & caveats

- **Why a committed baseline instead of the `001…025` migrations?** The live
  database was built directly in Supabase with **German** table names
  (`artikel`, `firmeneinstellungen`, …). The historical `supabase/migrations/`
  files create an unrelated **English** schema and do not reproduce production
  (see `docs/DB_STRUCTURE.md`). `supabase/test-baseline.sql` is generated from
  the live schema so the test DB matches the app exactly.
- **Schema over HTTPS.** The seeder uses the Supabase **Management API**
  (`/v1/projects/<ref>/database/query`), so it works even where direct Postgres
  ports (5432/6543) are blocked. It requires `SUPABASE_ACCESS_TOKEN`.
- **Skipped specs.** `account-addresses.spec.ts` needs a seeded **customer**
  user and is skipped unless `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` are set.
  `upload.spec.ts` needs Storage + editor access and is opt-in via
  `RUN_UPLOAD_E2E=1`. Neither is part of the default CI scope (admin +
  add-to-cart + public smoke).
- **Stripe / booking flows** are not exercised by the current suite (checkout
  stops before Stripe). See the "Optional next steps" in
  [E2E_TESTING.md](./E2E_TESTING.md#6-optional-next-steps-expanding-coverage).
- **Browsers.** CI is pinned to Chromium for speed/stability. Run the full
  matrix locally with `npm test`.
