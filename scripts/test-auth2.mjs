// Diagnostic v2 — tests actual login
// Run: node -r dotenv/config scripts/test-auth2.mjs
// ⚠️  NEVER commit real credentials. All keys come from .env.local.

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL    = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!URL || !ANON || !SRK) {
  console.error('ERROR: Missing Supabase env vars in .env.local');
  process.exit(1);
}

const admin = createClient(URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });
const anon  = createClient(URL, ANON);

async function run() {
  // 1. List auth users
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) { console.log('List error:', error.message); return; }

  console.log('AUTH USERS:');
  for (const u of data.users) {
    console.log(`  email=${u.email} confirmed=${!!u.email_confirmed_at} id=${u.id}`);
  }

  // 2. Check benutzer
  const { data: b, error: e2 } = await admin.from('benutzer').select('id,email,vorname,nachname,rolle,email_bestaetigt');
  if (e2) console.log('Benutzer error:', e2.message);
  else {
    console.log('\nBENUTZER TABLE:');
    for (const row of b) console.log(' ', JSON.stringify(row));
  }

  // 3. Try login with first user
  const testEmail = TEST_EMAIL || (data.users.length > 0 ? data.users[0].email : null);
  if (!testEmail || !TEST_PASSWORD) {
    console.log('\nSet TEST_EMAIL and TEST_PASSWORD env vars to test login.');
    return;
  }

  console.log(`\nTrying login with: ${testEmail}`);
  const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
    email: testEmail,
    password: TEST_PASSWORD,
  });
  if (loginErr) {
    console.log('LOGIN ERROR:', loginErr.message, loginErr.status);
  } else {
    console.log('LOGIN SUCCESS! User:', loginData.user?.email);
  }
}

run().catch(e => console.log('FATAL:', e.message));
