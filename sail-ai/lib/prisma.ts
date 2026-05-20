import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? ''

  // Warn loudly in dev when URL is missing or clearly wrong
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

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
