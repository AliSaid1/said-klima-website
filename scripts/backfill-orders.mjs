/**
 * Backfill missing Stripe data for existing orders.
 * Reads every order that has a stripe_session_id but is missing
 * rechnungsadresse_json / gast_email / stripe_payment_intent_id / bestellt_am / zahlungsmethode,
 * then re-fetches the Stripe session to fill in the gaps.
 *
 * Run once: node scripts/backfill-orders.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envFile = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY   = env.STRIPE_SECRET_KEY;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function dbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path} → ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

function buildAddr(addrSrc, name) {
  if (!addrSrc) return null;
  const obj = {
    name:      name || null,
    strasse:   addrSrc.line1        || null,
    zusatz:    addrSrc.line2        || null,
    plz:       addrSrc.postal_code  || null,
    ort:       addrSrc.city         || null,
    bundesland: addrSrc.state       || null,
    land:      addrSrc.country      || null,
  };
  // Only return if at least one address field has data
  return obj.strasse || obj.plz || obj.ort ? obj : null;
}

// Get all orders that have a stripe_session_id but missing key fields
const orders = await dbFetch(
  '/bestellungen?stripe_session_id=not.is.null&order=erstellt_am.asc&limit=100'
);

console.log(`Found ${orders.length} orders with stripe_session_id. Backfilling...\n`);

let fixed = 0, skipped = 0, failed = 0;

for (const order of orders) {
  const missing = [];
  if (!order.rechnungsadresse_json || JSON.stringify(order.rechnungsadresse_json) === '{}') missing.push('rechnungsadresse_json');
  if (!order.gast_email)              missing.push('gast_email');
  if (!order.stripe_payment_intent_id) missing.push('stripe_payment_intent_id');
  if (!order.bestellt_am)             missing.push('bestellt_am');
  if (!order.zahlungsmethode)         missing.push('zahlungsmethode');

  if (missing.length === 0) {
    console.log(`  ✅ ${order.bestellnummer} — already complete`);
    skipped++;
    continue;
  }

  console.log(`  🔧 ${order.bestellnummer} — missing: ${missing.join(', ')}`);

  try {
    // Fetch session with expanded payment_intent
    const session = await stripeGet(
      `/checkout/sessions/${order.stripe_session_id}?expand[]=payment_intent.payment_method`
    );

    if (session.payment_status !== 'paid') {
      console.log(`     ⚠️  Not paid (${session.payment_status}) — skipping`);
      skipped++;
      continue;
    }

    const pi      = session.payment_intent;
    const card    = pi?.payment_method?.card;
    const billing = pi?.payment_method?.billing_details;
    const details = session.customer_details;
    const shippingRaw = session.shipping_details ?? session.shipping ?? null;

    const lieferadresse =
      buildAddr(shippingRaw?.address, shippingRaw?.name ?? details?.name) ??
      buildAddr(details?.address, details?.name);

    const rechnungsadresse =
      buildAddr(details?.address, details?.name) ??
      buildAddr(billing?.address, billing?.name);

    const patch = { status: 'bezahlt' };
    if (rechnungsadresse) patch.rechnungsadresse_json = rechnungsadresse;
    if (lieferadresse && !order.lieferadresse_json) patch.lieferadresse_json = lieferadresse;
    if (details?.email)   patch.gast_email = details.email;
    if (pi?.id)           patch.stripe_payment_intent_id = pi.id;
    if (!order.bestellt_am) patch.bestellt_am = new Date().toISOString();
    if (card?.brand)      patch.zahlungsmethode = card.brand;

    await dbFetch(`/bestellungen?id=eq.${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });

    // Create zahlungen record if missing
    const existing = await dbFetch(`/zahlungen?bestellung_id=eq.${order.id}&limit=1`);
    if (!existing || existing.length === 0) {
      await dbFetch('/zahlungen', {
        method: 'POST',
        body: JSON.stringify({
          bestellung_id:            order.id,
          anbieter:                 'stripe',
          status:                   'erfasst',
          betrag_brutto:            (session.amount_total ?? 0) / 100,
          waehrung:                 session.currency ?? 'eur',
          stripe_payment_intent_id: pi?.id ?? null,
        }),
      });
      console.log(`     💳 zahlungen record created`);
    }

    console.log(`     ✅ Fixed: ${Object.keys(patch).join(', ')}`);
    fixed++;
  } catch (err) {
    console.error(`     ❌ Error: ${err.message}`);
    failed++;
  }
}

console.log(`\n=== Done: ${fixed} fixed, ${skipped} already complete, ${failed} failed ===`);

