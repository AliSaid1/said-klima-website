/**
 * apply-migrations.mjs — Run pending Supabase migrations via the Management API (HTTPS).
 *
 * WHY HTTPS:  Direct TCP Postgres connections (port 5432 / 6543) may be blocked by
 *             corporate networks.  The Supabase Management API uses port 443 (HTTPS)
 *             which is always open.
 *
 * REQUIREMENTS:
 *   1. Add SUPABASE_ACCESS_TOKEN to .env.local
 *      → Generate one at: https://supabase.com/dashboard/account/tokens
 *   2. NEXT_PUBLIC_SUPABASE_URL must also be in .env.local
 *
 * Usage:
 *   node -r dotenv/config scripts/apply-migrations.mjs
 *   # or with TLS bypass for corporate MITM proxies:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 node -r dotenv/config scripts/apply-migrations.mjs
 *
 * Safe to run multiple times — all SQL uses IF NOT EXISTS / DROP … IF EXISTS.
 */

// ── TLS bypass (corporate MITM proxy with self-signed cert) ──────────────────
// Already set via NODE_TLS_REJECT_UNAUTHORIZED=0 env var; no need to set here.
// If you get "certificate verification error", run with the env var above.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Read env ─────────────────────────────────────────────────────────────────
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN   = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}
if (!ACCESS_TOKEN) {
  console.error(`
ERROR: SUPABASE_ACCESS_TOKEN is not set.

To generate one:
  1. Go to https://supabase.com/dashboard/account/tokens
  2. Click "Generate new token"
  3. Copy the token and add to .env.local:
       SUPABASE_ACCESS_TOKEN=sbp_...

Then re-run this script.

Alternatively, copy the SQL from supabase/migrations/ and run it manually in:
  https://supabase.com/dashboard/project/<ref>/sql/new
`);
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error(`ERROR: Cannot extract project ref from URL: ${SUPABASE_URL}`);
  process.exit(1);
}
const PROJECT_REF = match[1];
console.log(`Project ref: ${PROJECT_REF}`);

// ── Migration list (order matters) ───────────────────────────────────────────
const MIGRATIONS = [
  {
    name: '011_bekannte_luecken',
    file: resolve(__dirname, '../supabase/migrations/011_bekannte_luecken.sql'),
    description: 'Add missing columns (checkout, webhook, audit)',
  },
  {
    name: '012_rls_policies',
    file: resolve(__dirname, '../supabase/migrations/012_rls_policies.sql'),
    description: 'RLS cleanup: remove incorrect auth policies, enforce service_role for admin',
  },
  {
    name: '013_rls_remaining_tables',
    file: resolve(__dirname, '../supabase/migrations/013_rls_remaining_tables.sql'),
    description: 'Enable RLS on 7 previously unprotected tables (all locked — service_role only)',
  },
  {
    name: '014_drop_unused_tables',
    file: resolve(__dirname, '../supabase/migrations/014_drop_unused_tables.sql'),
    description: 'Drop 4 unused tables: service_gebiete, service_gebiet_plz, warenkoerbe, warenkorb_positionen',
  },
  {
    name: '015_add_unique_slug_index',
    file: resolve(__dirname, '../supabase/migrations/015_add_unique_slug_index.sql'),
    description: 'Add UNIQUE index on artikel.slug to enforce slug uniqueness',
  },
  {
    name: '016_fix_auth_trigger',
    file: resolve(__dirname, '../supabase/migrations/016_fix_auth_trigger.sql'),
    description: 'Fix handle_new_user() re-registration bug, add email_bestaetigt UPDATE trigger, back-fill confirmed users',
  },
];

// ── Execute SQL via Management API ───────────────────────────────────────────
async function execSQL(sql, migrationName) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} for migration "${migrationName}": ${JSON.stringify(json)}`
    );
  }
  return json;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n========================================');
  console.log('  Supabase Migration Runner (HTTPS)');
  console.log('========================================\n');

  for (const migration of MIGRATIONS) {
    console.log(`▶ Running: ${migration.name}`);
    console.log(`  ${migration.description}`);

    let sql;
    try {
      sql = readFileSync(migration.file, 'utf8');
    } catch (e) {
      console.error(`  ✗ Cannot read file: ${migration.file}`);
      console.error(`    ${e.message}`);
      process.exit(1);
    }

    try {
      await execSQL(sql, migration.name);
      console.log(`  ✓ Done\n`);
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}\n`);
      console.error('Aborting — fix the error and re-run. Later migrations were NOT applied.');
      process.exit(1);
    }
  }

  console.log('========================================');
  console.log('  All migrations applied successfully!');
  console.log('========================================\n');
  console.log('Next steps:');
  console.log('  1. Verify in Supabase Table Editor that new columns exist');
  console.log('  2. Check RLS Policies in Authentication → Policies');
  console.log('  3. Run your app and test admin CRUD operations\n');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

