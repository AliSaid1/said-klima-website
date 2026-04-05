// Diagnostic v3 — CommonJS style
// Run: node -r dotenv/config scripts/test-auth3.cjs
// ⚠️  NEVER commit real credentials. All keys come from .env.local.
'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL    = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!URL || !ANON || !SRK) {
  console.error('ERROR: Missing Supabase env vars in .env.local');
  process.exit(1);
}

const adminClient = createClient(URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });
const anonClient  = createClient(URL, ANON);

async function run() {
  // 1. List auth users
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) { console.log('List error:', error.message); return; }

  console.log('AUTH USERS:');
  for (const u of data.users) {
    console.log('  email=' + u.email + ' confirmed=' + !!u.email_confirmed_at + ' id=' + u.id);
  }

  // 2. Check benutzer
  const { data: b, error: e2 } = await adminClient.from('benutzer').select('id,email,vorname,nachname,rolle,email_bestaetigt');
  if (e2) console.log('Benutzer error:', e2.message);
  else {
    console.log('\nBENUTZER TABLE:');
    for (const row of b) console.log('  ' + JSON.stringify(row));
  }

  // 3. Try login with first user (test password)
  const testEmail = TEST_EMAIL || (data.users.length > 0 ? data.users[0].email : null);
  if (!testEmail || !TEST_PASSWORD) {
    console.log('\nSet TEST_EMAIL and TEST_PASSWORD env vars to test login.');
    return;
  }

  console.log('\nTrying login with: ' + testEmail);
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: TEST_PASSWORD,
  });
  if (loginErr) {
    console.log('LOGIN ERROR: ' + loginErr.message + ' (status: ' + loginErr.status + ')');
  } else {
    console.log('LOGIN SUCCESS! User: ' + loginData.user?.email);
  }
}

run().catch(function(e) { console.log('FATAL: ' + e.message); });
