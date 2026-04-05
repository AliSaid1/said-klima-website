import postgres from 'postgres'

// ...existing code...
// Database connection helper for postgres.js
// - Validates that DATABASE_URL is present
// - Enables SSL (rejectUnauthorized: false) which is required for some hosted Postgres providers
// - Keeps a single client instance across HMR in development (attached to globalThis)

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set. Please add it to your .env.local')
}

// postgres.js options
const opts = {
  ssl: { rejectUnauthorized: false },
  // You can add other postgres.js options here if needed
}

// Reuse client across HMR/dev reloads to avoid creating multiple connections
const globalKey = '__postgres_sql_client__'
let sql
if (globalThis[globalKey]) {
  sql = globalThis[globalKey]
} else {
  sql = postgres(connectionString, opts)
  globalThis[globalKey] = sql
}

export default sql