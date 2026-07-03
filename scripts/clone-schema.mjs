/**
 * clone-schema.mjs — Clone the `public` schema from a SOURCE Supabase project
 * into a TARGET project using the Management API (HTTPS, no direct Postgres).
 *
 * WHY: the committed supabase/migrations/ do NOT reproduce the live German
 * schema (they create an older English schema). The only faithful source of the
 * real schema is the live database, so we read exact DDL from it via
 * pg_get_constraintdef / pg_get_functiondef / pg_get_triggerdef and replay it.
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN   Personal access token (Management API)
 *   SOURCE_REF              Source project ref (real/live project)
 *   TARGET_REF              Target project ref (throwaway TEST project)
 *
 * Usage:
 *   SOURCE_REF=xxx TARGET_REF=yyy node scripts/clone-schema.mjs
 *
 * ⚠️  Writes DDL to TARGET only. TARGET must be a dedicated test project.
 */

import { writeFileSync } from 'fs';

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SOURCE_REF = process.env.SOURCE_REF;
const TARGET_REF = process.env.TARGET_REF;

const required = { SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN, SOURCE_REF };
if (process.env.GENERATE_ONLY !== '1') required.TARGET_REF = TARGET_REF;
for (const [k, v] of Object.entries(required)) {
  if (!v) { console.error(`ERROR: ${k} is not set.`); process.exit(1); }
}

async function query(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const q = (id) => '"' + id.replace(/"/g, '""') + '"';

// GENERATE_ONLY=1 → only build the DDL file (read SOURCE), do not touch TARGET.
// OUTPUT_FILE=path → also write all generated statements to a file.
const APPLY = process.env.GENERATE_ONLY !== '1';
const OUTPUT_FILE = process.env.OUTPUT_FILE;
const statements = [];

// Postgres array text ("{a,b,\"c,d\"}") → JS array. Sufficient for enum labels
// and role names (no embedded newlines).
function parsePgArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  const s = String(v).trim().replace(/^\{/, '').replace(/\}$/, '');
  if (s === '') return [];
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    out.push(m[1] != null ? m[1].replace(/\\(.)/g, '$1') : m[2].trim());
  }
  return out;
}

let ok = 0, failed = 0;
async function apply(sql, label, fatal = false) {
  statements.push(`-- ${label}\n${sql}`);
  if (!APPLY) { ok++; return; }
  try {
    await query(TARGET_REF, sql);
    ok++;
  } catch (e) {
    failed++;
    console.log(`   ✗ ${label}: ${e.message.slice(0, 200)}`);
    if (fatal) process.exit(1);
  }
}

// English tables created by the obsolete migration 001 — remove them.
const ENGLISH_TABLES = [
  'order_items', 'orders', 'product_variants', 'product_images', 'product_categories',
  'products', 'categories', 'content_versions', 'content_pages', 'company_settings',
  'email_templates', 'bookings', 'time_slots', 'blocked_dates',
];

async function main() {
  console.log(`\n▶ Cloning public schema  ${SOURCE_REF}  →  ${TARGET_REF}\n`);

  // ── 0. Clean obsolete English tables + helper fn on target ──────────────────
  console.log('• Cleaning obsolete objects on target');
  for (const t of ENGLISH_TABLES) await apply(`DROP TABLE IF EXISTS public.${q(t)} CASCADE;`, `drop ${t}`);

  // ── 1. Enum types ───────────────────────────────────────────────────────────
  const enums = await query(SOURCE_REF, `
    select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid=t.oid
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' group by t.typname;`);
  console.log(`• Enums: ${enums.length}`);
  for (const en of enums) {
    const labels = parsePgArray(en.labels).map((l) => `'${l.replace(/'/g, "''")}'`).join(', ');
    await apply(`DROP TYPE IF EXISTS public.${q(en.name)} CASCADE; CREATE TYPE public.${q(en.name)} AS ENUM (${labels});`, `type ${en.name}`);
  }

  // ── 2. Sequences ────────────────────────────────────────────────────────────
  const seqs = await query(SOURCE_REF, `select sequencename from pg_sequences where schemaname='public';`);
  console.log(`• Sequences: ${seqs.length}`);
  for (const s of seqs) await apply(`CREATE SEQUENCE IF NOT EXISTS public.${q(s.sequencename)};`, `seq ${s.sequencename}`);

  // ── 3. Tables (columns only) ────────────────────────────────────────────────
  const tables = (await query(SOURCE_REF, `
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by c.relname;`)).map((r) => r.relname);

  const cols = await query(SOURCE_REF, `
    select c.relname as tbl, a.attname as col,
           pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
           a.attnotnull as notnull, a.attidentity as identity,
           pg_get_expr(ad.adbin, ad.adrelid) as dflt
    from pg_attribute a
    join pg_class c on c.oid=a.attrelid
    join pg_namespace n on n.oid=c.relnamespace
    left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
    where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped
    order by c.relname, a.attnum;`);

  const byTable = {};
  for (const c of cols) (byTable[c.tbl] ||= []).push(c);

  console.log(`• Tables: ${tables.length}`);
  for (const t of tables) {
    const defs = (byTable[t] || []).map((c) => {
      let d = `${q(c.col)} ${c.type}`;
      if (c.identity === 'a') d += ' GENERATED ALWAYS AS IDENTITY';
      else if (c.identity === 'd') d += ' GENERATED BY DEFAULT AS IDENTITY';
      else if (c.dflt != null) d += ` DEFAULT ${c.dflt}`;
      if (c.notnull) d += ' NOT NULL';
      return d;
    });
    await apply(`CREATE TABLE IF NOT EXISTS public.${q(t)} (\n  ${defs.join(',\n  ')}\n);`, `table ${t}`, true);
  }

  // ── 4/5. Constraints (PK/UNIQUE/CHECK first, then FK) ───────────────────────
  const cons = await query(SOURCE_REF, `
    select c.relname as tbl, con.conname as name, con.contype as type,
           pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public';`);
  const constraintNames = new Set(cons.map((c) => c.name));
  const nonFk = cons.filter((c) => c.type !== 'f');
  const fk = cons.filter((c) => c.type === 'f');
  console.log(`• Constraints: ${nonFk.length} (pk/uq/check) + ${fk.length} (fk)`);
  for (const c of [...nonFk, ...fk]) {
    await apply(`ALTER TABLE public.${q(c.tbl)} ADD CONSTRAINT ${q(c.name)} ${c.def};`, `constraint ${c.name}`);
  }

  // ── 6. Indexes (skip those backing a constraint) ────────────────────────────
  const idx = await query(SOURCE_REF, `select indexname, indexdef from pg_indexes where schemaname='public';`);
  const extraIdx = idx.filter((i) => !constraintNames.has(i.indexname));
  console.log(`• Indexes: ${extraIdx.length}`);
  for (const i of extraIdx) await apply(`${i.indexdef};`, `index ${i.indexname}`);

  // ── 7. Functions ────────────────────────────────────────────────────────────
  const fns = await query(SOURCE_REF, `
    select p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public';`);
  console.log(`• Functions: ${fns.length}`);
  for (const f of fns) await apply(`${f.def};`, `function ${f.proname}`);

  // ── 8. Triggers (public tables + auth.users) ────────────────────────────────
  const trg = await query(SOURCE_REF, `
    select t.tgname, n.nspname as schema, c.relname as tbl, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and (n.nspname='public' or (n.nspname='auth' and c.relname='users'));`);
  console.log(`• Triggers: ${trg.length}`);
  for (const t of trg) {
    await apply(`DROP TRIGGER IF EXISTS ${q(t.tgname)} ON ${q(t.schema)}.${q(t.tbl)}; ${t.def};`, `trigger ${t.tgname}`);
  }

  // ── 9. RLS enable + policies ────────────────────────────────────────────────
  const rlsTables = await query(SOURCE_REF, `
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity;`);
  console.log(`• RLS-enabled tables: ${rlsTables.length}`);
  for (const r of rlsTables) await apply(`ALTER TABLE public.${q(r.relname)} ENABLE ROW LEVEL SECURITY;`, `rls ${r.relname}`);

  const policies = await query(SOURCE_REF, `
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies where schemaname='public';`);
  console.log(`• Policies: ${policies.length}`);
  for (const p of policies) {
    const roles = parsePgArray(p.roles).join(', ') || 'public';
    let sql = `DROP POLICY IF EXISTS ${q(p.policyname)} ON public.${q(p.tablename)};\n`;
    sql += `CREATE POLICY ${q(p.policyname)} ON public.${q(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${roles}`;
    if (p.qual != null) sql += ` USING (${p.qual})`;
    if (p.with_check != null) sql += ` WITH CHECK (${p.with_check})`;
    await apply(`${sql};`, `policy ${p.policyname}`);
  }

  // ── 10. Grants (mirror Supabase defaults) ───────────────────────────────────
  await apply(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`, 'grant schema');
  await apply(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;`, 'grant tables');
  await apply(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`, 'grant sequences');

  if (OUTPUT_FILE) {
    const header = `-- Baseline schema for the E2E TEST database.\n`
      + `-- Generated by scripts/clone-schema.mjs from the live schema.\n`
      + `-- Do NOT edit by hand; regenerate with:\n`
      + `--   GENERATE_ONLY=1 OUTPUT_FILE=${OUTPUT_FILE} SOURCE_REF=<ref> node scripts/clone-schema.mjs\n\n`;
    writeFileSync(OUTPUT_FILE, header + statements.join('\n\n') + '\n');
    console.log(`• Wrote ${statements.length} statements to ${OUTPUT_FILE}`);
  }

  console.log(`\n✓ Clone finished — ${ok} statements ok, ${failed} failed.\n`);
  if (failed > 0) process.exitCode = 2;
}

main().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
