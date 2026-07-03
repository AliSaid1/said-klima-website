/**
 * seed-test-db.mjs — Prepare a Supabase *test* project for E2E tests.
 *
 * Deterministic + idempotent (safe to re-run in CI). It:
 *   1. Resets the `public` schema (drop + recreate + re-grant).
 *   2. Applies the committed baseline schema `supabase/test-baseline.sql`
 *      (a faithful snapshot of the live German schema — see scripts/clone-schema.mjs).
 *   3. Loads the German test catalog `supabase/migrations/004_seed_testdaten.sql`
 *      (products with stock, so the add-to-cart E2E test runs instead of skipping).
 *   4. Creates/resets the E2E admin user from TEST_EMAIL / TEST_PASSWORD and
 *      promotes it to rolle='admin' in public.benutzer.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL      https://<ref>.supabase.co  (the TEST project)
 *   SUPABASE_ACCESS_TOKEN         Personal access token (Management API)
 *   SUPABASE_SERVICE_ROLE_KEY     Service-role / secret key (Auth admin API)
 *   TEST_EMAIL / TEST_PASSWORD    Credentials for the seeded admin user
 * Optional:
 *   RESET_SCHEMA=0                Skip the public-schema reset
 *
 * Usage:
 *   node -r dotenv/config scripts/seed-test-db.mjs
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 node -r dotenv/config scripts/seed-test-db.mjs
 *
 * WARNING: Point this at a DEDICATED TEST project — step 1 wipes the public schema.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE = resolve(__dirname, '../supabase/test-baseline.sql');
const SEED = resolve(__dirname, '../supabase/migrations/004_seed_testdaten.sql');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  TEST_EMAIL,
  TEST_PASSWORD,
})) {
  if (!v) { console.error(`ERROR: ${k} is not set.`); process.exit(1); }
}

const refMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) { console.error(`ERROR: Cannot parse project ref from ${SUPABASE_URL}`); process.exit(1); }
const PROJECT_REF = refMatch[1];

async function execSQL(sql, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${label}": ${text}`);
  return text;
}

async function resetSchema() {
  if (process.env.RESET_SCHEMA === '0') { console.log('- Schema reset skipped (RESET_SCHEMA=0)'); return; }
  console.log('- Resetting public schema');
  await execSQL(
    `DROP SCHEMA IF EXISTS public CASCADE;
     CREATE SCHEMA public;
     GRANT ALL ON SCHEMA public TO postgres;
     GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;`,
    'reset-schema',
  );
}

async function applyFile(path, label) {
  console.log(`- Applying ${label}`);
  await execSQL(readFileSync(path, 'utf8'), label);
}

async function ensureAdminUser() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(`- Ensuring admin test user: ${TEST_EMAIL}`);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { vorname: 'E2E', nachname: 'Admin' },
  });

  let userId = created?.user?.id;
  if (createErr) {
    if (/already|registered|exists/i.test(createErr.message)) {
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === TEST_EMAIL);
      if (!existing) throw new Error('User exists but not found via listUsers()');
      userId = existing.id;
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password: TEST_PASSWORD, email_confirm: true,
      });
      if (updErr) throw updErr;
      console.log('  - existing user password reset');
    } else {
      throw createErr;
    }
  } else {
    console.log(`  - created user ${userId}`);
  }

  if (!userId) throw new Error('Could not determine admin user id');

  // The public schema (incl. benutzer) is wiped on every seed run, but the
  // auth user persists. On re-runs the user already exists, so createUser
  // takes the "already exists" path and the on_auth_user_created trigger
  // (which inserts the benutzer row) never fires. Explicitly upsert the
  // benutzer row keyed by the auth user id so the row always exists and is
  // promoted to admin — otherwise the client-side admin role check gets 0
  // rows (406) and redirects away from /admin.
  const emailSql = TEST_EMAIL.replace(/'/g, "''");
  await execSQL(
    `INSERT INTO public.benutzer (id, vorname, nachname, email, passwort_hash, rolle, email_bestaetigt)
       VALUES ('${userId}', 'E2E', 'Admin', '${emailSql}', 'supabase-auth', 'admin', true)
     ON CONFLICT (id) DO UPDATE SET
       rolle='admin', email_bestaetigt=true, email=EXCLUDED.email, aktualisiert_am=now();`,
    'promote-admin',
  );
  console.log("  - benutzer row upserted + promoted to rolle='admin'");
}

async function main() {
  console.log('========================================');
  console.log('  Supabase E2E Test-DB Seeder');
  console.log(`  Project: ${PROJECT_REF}`);
  console.log('========================================\n');
  await resetSchema();
  await applyFile(BASELINE, 'baseline schema (test-baseline.sql)');
  await applyFile(SEED, 'test catalog (004_seed_testdaten.sql)');
  await ensureAdminUser();
  // PostgREST caches the schema; force a reload so embedded FK selects
  // (e.g. artikel -> marken/kategorien/lagerbestaende) resolve immediately.
  console.log('- Reloading PostgREST schema cache');
  await execSQL(`NOTIFY pgrst, 'reload schema';`, 'reload-schema-cache');
  console.log('\nDone. Test database seeded and ready for E2E tests.\n');
}

main().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
