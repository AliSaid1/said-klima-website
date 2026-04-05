import { readFileSync } from 'fs';
import { resolve } from 'path';
import https from 'https';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envFile = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const agent = new https.Agent({ rejectUnauthorized: false });

async function query(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const res = await fetch(url, {
    // @ts-ignore
    dispatcher: undefined,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// Latest 3 orders
const orders = await query('bestellungen', '?order=erstellt_am.desc&limit=3');
console.log('\n=== Latest 3 orders ===');
for (const o of orders) {
  console.log(JSON.stringify(o, null, 2));
}

// Bestellpositionen for latest order
if (orders.length > 0) {
  const pos = await query('bestellpositionen', `?bestellung_id=eq.${orders[0].id}`);
  console.log(`\n=== Bestellpositionen for order ${orders[0].bestellnummer} ===`);
  for (const p of pos) {
    console.log(JSON.stringify(p, null, 2));
  }

  // Zahlungen for latest order
  const zahlen = await query('zahlungen', `?bestellung_id=eq.${orders[0].id}`);
  console.log(`\n=== Zahlungen for order ${orders[0].bestellnummer} ===`);
  for (const z of zahlen) {
    console.log(JSON.stringify(z, null, 2));
  }
}

// Summary: which columns are null across all orders
console.log('\n=== NULL column audit (all orders) ===');
const allOrders = await query('bestellungen', '?order=erstellt_am.desc&limit=20');
const nullCounts = {};
for (const o of allOrders) {
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === '{}' || v === '') {
      nullCounts[k] = (nullCounts[k] || 0) + 1;
    }
  }
}
const total = allOrders.length;
console.log(`Checked ${total} order(s). Columns with null/empty values:`);
for (const [col, count] of Object.entries(nullCounts).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${col.padEnd(35)} null in ${count}/${total} orders`);
}



