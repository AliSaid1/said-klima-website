// Quick diagnostic script — run with: node -r dotenv/config scripts/test-auth.mjs
// OR export env vars in your shell first.
// ⚠️  NEVER commit real credentials — all keys come from .env.local.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env.local explicitly
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const admin    = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function diagnose() {
  console.log('=== SUPABASE AUTH DIAGNOSTICS ===\n');

  console.log('1. Listing all auth users...');
  const { data: authUsers, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.log('   ERROR listing users:', listError.message);
  } else {
    console.log(`   Found ${authUsers.users.length} user(s):`);
    for (const u of authUsers.users) {
      console.log(`   - ${u.email} | confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'} | id: ${u.id}`);
    }
  }

  console.log('\n2. Checking benutzer table...');
  const { data: benutzer, error: benError } = await admin.from('benutzer').select('*');
  if (benError) {
    console.log('   ERROR:', benError.message);
  } else {
    console.log(`   Found ${benutzer.length} row(s):`);
    for (const b of benutzer) {
      console.log(`   - ${b.email} (${b.vorname} ${b.nachname}) | rolle: ${b.rolle}`);
    }
  }

  if (authUsers?.users) {
    const unconfirmed = authUsers.users.filter(u => !u.email_confirmed_at);
    if (unconfirmed.length > 0) {
      console.log('\n⚠️  FOUND UNCONFIRMED USERS — fixing...');
      for (const u of unconfirmed) {
        const { error: updateError } = await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
        console.log(`   ${u.email}: ${updateError ? 'FAILED ' + updateError.message : 'confirmed ✓'}`);
      }
    } else {
      console.log('\n✓ All users have confirmed emails.');
    }
  }
}

diagnose().catch(console.error);
