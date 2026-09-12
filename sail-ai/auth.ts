import NextAuth             from 'next-auth'
import { PrismaAdapter }   from '@auth/prisma-adapter'
import GoogleProvider      from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma }          from '@/lib/prisma'
import { authConfig }      from './auth.config'
import { checkPro }        from '@/lib/proStore'

/** Returns true only when DATABASE_URL points to a real PostgreSQL server */
function hasValidDb(): boolean {
  const url = process.env.DATABASE_URL ?? ''
  return url.startsWith('postgres') || url.startsWith('prisma')
}

/** Race a promise against a fallback so a slow call can't block sign-in. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

function buildProviders() {
  const list: any[] = []

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt:        'consent',
            access_type:   'offline',
            response_type: 'code',
          },
        },
      }),
    )
  }

  list.push(
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Fail fast with a recognizable error when DB isn't configured
        if (!hasValidDb()) {
          throw new Error('DATABASE_NOT_CONFIGURED')
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          })

          if (!user?.password) return null

          // Dynamic import to keep bcryptjs out of Edge runtime
          const bcrypt = await import('bcryptjs')
          const valid  = await bcrypt.compare(credentials.password as string, user.password)
          if (!valid) return null

          return user
        } catch (err: any) {
          if (err?.message === 'DATABASE_NOT_CONFIGURED') throw err
          // DB IS configured but the query failed (cold start, timeout, transient).
          // Surface a distinct, retryable code instead of the misleading
          // "not configured" message the user was seeing on a slow connection.
          console.error('[auth] credentials query failed:', err?.message ?? err)
          throw new Error('DATABASE_CONNECTION_ERROR')
        }
      },
    }),
  )

  return list
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret:   process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  // Only attach the Prisma adapter when the database is actually reachable.
  // `prisma` is wrapped in a retry extension, so its type differs from the bare
  // PrismaClient the adapter expects, but the delegates it uses are identical.
  ...(hasValidDb() ? { adapter: PrismaAdapter(prisma as never) } : {}),

  session:   { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: buildProviders(),

  callbacks: {
    ...authConfig.callbacks,

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return url
      try { if (new URL(url).origin === new URL(baseUrl).origin) return url } catch {}
      return '/chat'
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id    = user.id
        // Cap the Pro lookup so a slow DB/Stripe call can't stall sign-in;
        // it refreshes on the next `update` trigger anyway.
        token.isPro = await withTimeout(checkPro(user.email ?? '').catch(() => false), 2500, false)
      }
      if (trigger === 'update') {
        token.isPro = await withTimeout(checkPro(token.email ?? '').catch(() => false), 2500, false)
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id    as string
        session.user.isPro = token.isPro as boolean
      }
      return session
    },
  },
})
