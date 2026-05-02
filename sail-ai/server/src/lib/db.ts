/**
 * PostgreSQL connection pool — shared across all server routes.
 *
 * Uses the same DATABASE_URL that the Next.js frontend uses for Prisma.
 * On Railway, set DATABASE_URL in the Express service's environment variables
 * (same value as the Next.js service — both point to the shared Postgres instance).
 *
 * The pool is lazily created on first use and reused for the lifetime of the
 * process. If DATABASE_URL is not set, getPool() returns null and callers
 * should degrade gracefully.
 */

import { Pool } from 'pg'

let _pool: Pool | null = null

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Railway Postgres uses SSL in production
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      max:             10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })

    _pool.on('error', (err) => {
      console.error('[db] idle client error:', err.message)
    })
  }
  return _pool
}
