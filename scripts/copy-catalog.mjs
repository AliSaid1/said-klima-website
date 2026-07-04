/**
 * copy-catalog.mjs — Copy the product catalog from one Supabase project to
 * another (e.g. PRODUCTION → STAGING/TEST) so a staging site shows the same
 * products and images as production.
 *
 * Copies, in FK-safe order:
 *   marken, kategorien, medien_dateien, artikel, artikel_bilder,
 *   lagerbestaende, artikel_technische_daten
 * ...and the `product-images` Storage bucket (unless SKIP_STORAGE=1).
 *
 * It UPSERTS by primary key, so it is safe to re-run and it never deletes rows
 * that only exist in the target.
 *
 * ── Credentials (env vars) ──────────────────────────────────────────────────
 *   SOURCE_SUPABASE_URL           default: NEXT_PUBLIC_SUPABASE_URL   (read-only)
 *   SOURCE_SERVICE_ROLE_KEY       default: SUPABASE_SERVICE_ROLE_KEY
 *   TARGET_SUPABASE_URL           the staging/test project (written to). If unset,
 *                                 falls back to NEXT_PUBLIC_SUPABASE_URL in .env.e2e.local
 *   TARGET_SERVICE_ROLE_KEY       if unset, falls back to SUPABASE_SERVICE_ROLE_KEY
 *                                 in .env.e2e.local
 * Optional:
 *   SKIP_STORAGE=1                skip copying image files (rows only)
 *   DRY_RUN=1                     read + report counts, write nothing
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   # SOURCE defaults to .env.local (production). TARGET defaults to the
 *   # test/staging project in .env.e2e.local. So this just works:
 *   npm run copy:catalog
 *   # ...or override the target explicitly (PowerShell):
 *   #   $env:TARGET_SUPABASE_URL="https://<ref>.supabase.co"
 *   #   $env:TARGET_SERVICE_ROLE_KEY="<key>"; npm run copy:catalog
 *
 * ⚠️ NOTE: if the target is the same project CI reseeds (npm run seed:test),
 * this copy is ephemeral — the next CI run wipes it. For persistent staging
 * data, target a DEDICATED staging project that CI never touches.
 *
 * ⚠️ Local TLS: this machine intercepts TLS; the npm script sets
 * NODE_TLS_REJECT_UNAUTHORIZED=0 so the REST/Storage calls succeed.
 */

import fs from 'node:fs';

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Target defaults: explicit TARGET_* env vars win; otherwise fall back to the
// test/staging project defined in .env.e2e.local so `npm run copy:catalog`
// works out of the box (source = production via .env.local, target = staging).
const e2eEnv = readEnvFile('.env.e2e.local');
const TARGET_URL = process.env.TARGET_SUPABASE_URL || e2eEnv.NEXT_PUBLIC_SUPABASE_URL;
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY || e2eEnv.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_ACCESS_TOKEN =
  process.env.TARGET_ACCESS_TOKEN || e2eEnv.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;

function readEnvFile(path) {
  try {
    const out = {};
    for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trimStart().startsWith('#')) {
        out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

const DRY_RUN = process.env.DRY_RUN === '1';
const SKIP_STORAGE = process.env.SKIP_STORAGE === '1';
const BUCKET = 'product-images';

// Copy order respects foreign keys (parents before children).
const TABLES = [
  'marken',
  'kategorien',
  'medien_dateien',
  'artikel',
  'artikel_bilder',
  'lagerbestaende',
  'artikel_technische_daten',
];

function requireEnv() {
  const missing = [];
  if (!SOURCE_URL) missing.push('SOURCE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  if (!SOURCE_KEY) missing.push('SOURCE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  if (!DRY_RUN) {
    if (!TARGET_URL) missing.push('TARGET_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL in .env.e2e.local)');
    if (!TARGET_KEY) missing.push('TARGET_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY in .env.e2e.local)');
  }
  if (missing.length) {
    console.error('ERROR: missing env vars:\n  - ' + missing.join('\n  - '));
    process.exit(1);
  }
  if (!DRY_RUN && SOURCE_URL === TARGET_URL) {
    console.error('ERROR: SOURCE and TARGET are the same project. Refusing to run.');
    process.exit(1);
  }
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function selectAll(table) {
  const res = await fetch(`${SOURCE_URL}/rest/v1/${table}?select=*`, {
    headers: headers(SOURCE_KEY, { Accept: 'application/json' }),
  });
  if (!res.ok) throw new Error(`read ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function upsertRows(table, rows) {
  if (!rows.length) return;
  const res = await fetch(`${TARGET_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(TARGET_KEY, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`write ${table}: ${res.status} ${await res.text()}`);
}

// kategorien can reference a parent kategorie; insert roots (parent_id null) first.
function sortForFk(table, rows) {
  if (table !== 'kategorien') return rows;
  return [...rows].sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
}

// Clear the target catalog so production rows copy in with their ORIGINAL ids
// (keeps artikel_bilder → artikel FKs intact). Uses the Supabase Management API
// with the account access token. TRUNCATE … CASCADE also clears dependent rows
// (e.g. order lines) — acceptable for a disposable staging/test project.
async function clearTargetCatalog() {
  if (process.env.SKIP_CLEAR === '1') { console.log('- clear target: skipped (SKIP_CLEAR=1)'); return; }
  if (!TARGET_ACCESS_TOKEN) {
    throw new Error(
      'clearing the target needs an account access token. Set SUPABASE_ACCESS_TOKEN ' +
      'in .env.e2e.local (or TARGET_ACCESS_TOKEN), or pass SKIP_CLEAR=1 to skip.',
    );
  }
  const ref = (TARGET_URL.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
  if (!ref) throw new Error(`cannot parse project ref from TARGET_SUPABASE_URL: ${TARGET_URL}`);
  const list = TABLES.map((t) => `public.${t}`).join(', ');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TARGET_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `TRUNCATE ${list} RESTART IDENTITY CASCADE;` }),
  });
  if (!res.ok) throw new Error(`clear target: HTTP ${res.status} ${await res.text()}`);
  console.log(`- clear target: truncated ${TABLES.length} catalog tables`);
}

async function copyTables() {
  if (!DRY_RUN) await clearTargetCatalog();
  for (const table of TABLES) {
    const rows = await selectAll(table);
    console.log(`- ${table}: ${rows.length} row(s)${DRY_RUN ? ' (dry-run, not written)' : ''}`);
    if (!DRY_RUN) await upsertRows(table, sortForFk(table, rows));
  }
}

async function listBucket() {
  const res = await fetch(`${SOURCE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: headers(SOURCE_KEY, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!res.ok) throw new Error(`list bucket: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ensureTargetBucket() {
  const res = await fetch(`${TARGET_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: headers(TARGET_KEY, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // 200 = created; 400/409 = already exists — both fine.
  if (!res.ok && ![400, 409].includes(res.status)) {
    throw new Error(`create bucket: ${res.status} ${await res.text()}`);
  }
}

async function copyStorage() {
  if (SKIP_STORAGE) { console.log('- storage: skipped (SKIP_STORAGE=1)'); return; }
  const objects = (await listBucket()).filter((o) => o.name && o.id !== null);
  console.log(`- storage/${BUCKET}: ${objects.length} file(s)${DRY_RUN ? ' (dry-run)' : ''}`);
  if (DRY_RUN) return;
  await ensureTargetBucket();
  for (const obj of objects) {
    const dl = await fetch(`${SOURCE_URL}/storage/v1/object/${BUCKET}/${obj.name}`, {
      headers: headers(SOURCE_KEY),
    });
    if (!dl.ok) { console.warn(`  ! download ${obj.name}: ${dl.status}`); continue; }
    const body = Buffer.from(await dl.arrayBuffer());
    const contentType = dl.headers.get('content-type') || 'application/octet-stream';
    const up = await fetch(`${TARGET_URL}/storage/v1/object/${BUCKET}/${obj.name}`, {
      method: 'POST',
      headers: headers(TARGET_KEY, { 'Content-Type': contentType, 'x-upsert': 'true' }),
      body,
    });
    if (!up.ok) console.warn(`  ! upload ${obj.name}: ${up.status} ${await up.text()}`);
  }
}

async function main() {
  requireEnv();
  console.log('========================================');
  console.log('  Catalog copy');
  console.log(`  FROM: ${SOURCE_URL}`);
  console.log(`  TO:   ${TARGET_URL}`);
  if (DRY_RUN) console.log('  MODE: DRY RUN (no writes)');
  console.log('========================================\n');
  await copyTables();
  await copyStorage();
  console.log('\nDone.' + (DRY_RUN ? ' (dry run — nothing was written)' : ''));
}

main().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
