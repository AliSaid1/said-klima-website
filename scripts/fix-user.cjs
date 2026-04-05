// Fix user — reset password and confirm email
// Setup: copy .env.local to the project root (it already is).
// Run:   node -r dotenv/config scripts/fix-user.cjs
//   or:  node scripts/fix-user.cjs   (if NEXT_PUBLIC_SUPABASE_URL etc. are exported in your shell)
//
// ⚠️  NEVER commit real credentials. All secrets are read from environment variables.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !SRK || !ANON) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const USER_EMAIL  = process.env.FIX_USER_EMAIL;
const NEW_PASSWORD = process.env.FIX_USER_PASSWORD;

if (!USER_EMAIL || !NEW_PASSWORD) {
  console.error('ERROR: Set FIX_USER_EMAIL and FIX_USER_PASSWORD environment variables before running this script.');
  process.exit(1);
}

const admin = createClient(URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });
const anon  = createClient(URL, ANON);

async function fix() {
  // 1. Find the user
  const { data: users } = await admin.auth.admin.listUsers();
  const user = users.users.find(u => u.email === USER_EMAIL);

  if (!user) {
    console.log('User not found: ' + USER_EMAIL);
    return;
  }

  console.log('Found user: ' + user.email + ' (id: ' + user.id + ')');
  console.log('Confirmed: ' + !!user.email_confirmed_at);

  // 2. Force reset password + confirm email
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password: NEW_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.log('ERROR updating user: ' + error.message);
    return;
  }

  console.log('Password updated. Email confirmed: true');

  // 3. Test login with new password
  console.log('\nTesting login...');
  const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
    email: USER_EMAIL,
    password: NEW_PASSWORD,
  });

  if (loginErr) {
    console.log('LOGIN FAILED: ' + loginErr.message);
  } else {
    console.log('LOGIN SUCCESS! User ID: ' + loginData.user.id);
  }
}

fix().catch(function(e) { console.log('FATAL: ' + e.message); });
