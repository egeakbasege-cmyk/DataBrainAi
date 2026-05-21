import { PrismaClient } from '@prisma/client'
import { PrismaPg }    from '@prisma/adapter-pg'
import { Pool }        from 'pg'

// ── Prisma v7 connection via pg adapter ──────────────────────────────────────
// Prisma 7 dropped the datasource.url field from schema.prisma.
// Connection is established here via PrismaPg adapter + pg.Pool.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.')
  }

  const pool    = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter } as any)
}

// Singleton pattern — reuse across hot-reload in development
export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export default prisma
