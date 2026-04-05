import supabaseAdmin from '../lib/supabase-server.js'

async function test() {
  try {
    // Use an RPC or simple table select; we'll select a small known table: rechtstexte (if exists)
    const { data, error, status } = await supabaseAdmin.from('rechtstexte').select('id,slug,titel').limit(3)
    if (error) {
      console.error('Supabase HTTP query error', status, error.message)
      process.exit(1)
    }
    console.log('Supabase HTTP query success, rows:', data.length)
    console.log(data)
  } catch (err) {
    console.error('Supabase HTTP test failed:', err.message)
    process.exit(1)
  }
}

test()

