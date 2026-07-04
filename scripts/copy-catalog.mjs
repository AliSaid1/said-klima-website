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
 *   TARGET_SUPABASE_URL           REQUIRED — the staging/test project (written to)
 *   TARGET_SERVICE_ROLE_KEY       REQUIRED
 * Optional:
 *   SKIP_STORAGE=1                skip copying image files (rows only)
 *   DRY_RUN=1                     read + report counts, write nothing
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   # SOURCE defaults to whatever .env.local points at (production).
 *   # Provide TARGET_* for the staging/test project, then:
 *   npm run copy:catalog
 *
 * ⚠️ NOTE: if the target is the same project CI reseeds (npm run seed:test),
 * this copy is ephemeral — the next CI run wipes it. For persistent staging
 * data, target a DEDICATED staging project that CI never touches.
 *
 * ⚠️ Local TLS: this machine intercepts TLS; the npm script sets
 * NODE_TLS_REJECT_UNAUTHORIZED=0 so the REST/Storage calls succeed.
 */

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.TARGET_SUPABASE_URL;
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY;

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
    if (!TARGET_URL) missing.push('TARGET_SUPABASE_URL');
    if (!TARGET_KEY) missing.push('TARGET_SERVICE_ROLE_KEY');
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

async function copyTables() {
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
