import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Neon Postgres scales its compute to zero when idle. The FIRST query after an
 * idle period has to wake the compute, which can take a couple of seconds, and
 * that first connection attempt often fails with a transient error (timeout /
 * "can't reach database" / server closed the connection). The retry it away —
 * this is exactly why signing in used to fail on the first try and work on the
 * second. This client transparently retries those transient errors so a single
 * attempt succeeds.
 */

// Prisma error codes that mean "the query never reached the DB" → safe to retry.
const RETRYABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])

function isRetryable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true
  if (err instanceof Prisma.PrismaClientKnownRequestError) return RETRYABLE_CODES.has(err.code)
  const msg = (err as { message?: string })?.message ?? ''
  return /can'?t reach database|connection|ECONNRESET|ETIMEDOUT|EPIPE|terminating connection|server has closed|timed out|Closed/i.test(msg)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Backoff schedule for the retries after the first failed attempt (ms).
// ~2.7s of total waiting worst case — enough to cover a cold Neon wake-up
// while staying well under the serverless function timeout.
const BACKOFF_MS = [300, 700, 1200, 500]

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? ''

  if (process.env.NODE_ENV !== 'production') {
    if (!url) {
      console.error('[prisma] DATABASE_URL is not set. Auth and DB features will fail.')
    } else if (url.startsWith('file:')) {
      console.error(
        '[prisma] DATABASE_URL looks like a SQLite path ("file:…") but the schema uses PostgreSQL.\n' +
        '  Fix: set DATABASE_URL to a real PostgreSQL connection string in .env.local\n' +
        '  Example: postgresql://user:pass@host/db?sslmode=require\n' +
        '  Free option: https://neon.tech',
      )
    }
  }

  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  return base.$extends({
    name: 'retry-on-cold-start',
    query: {
      async $allOperations({ args, query }) {
        let lastErr: unknown
        for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
          try {
            return await query(args)
          } catch (err) {
            lastErr = err
            if (attempt === BACKOFF_MS.length || !isRetryable(err)) throw err
            console.warn(`[prisma] transient DB error, retrying (attempt ${attempt + 1})…`)
            await sleep(BACKOFF_MS[attempt])
          }
        }
        throw lastErr
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Reuse a single client across warm serverless invocations (production included)
// so each sign-in doesn't pay to spin up a fresh client and open a new connection.
globalForPrisma.prisma = prisma
