import sql from '../Database/db.js'

async function test() {
  try {
    const res = await sql`select now() as now`
    console.log('Connected to DB, now:', res[0].now)
  } catch (err) {
    console.error('DB connection failed:', err.message)
    process.exit(1)
  } finally {
    // close connection in postgres.js by calling end() if available
    if (sql && typeof sql.end === 'function') await sql.end({ timeout: 5 })
  }
}

test()

