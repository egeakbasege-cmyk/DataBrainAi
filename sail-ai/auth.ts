import NextAuth                from 'next-auth'
import { PrismaAdapter }       from '@auth/prisma-adapter'
import GoogleProvider          from 'next-auth/providers/google'
import CredentialsProvider     from 'next-auth/providers/credentials'
import { prisma }              from '@/lib/prisma'
import { authConfig }          from './auth.config'
import { checkPro }            from '@/lib/proStore'

function buildProviders() {
  const list: any[] = []
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user?.password) return null

        // Dynamic import to keep bcryptjs out of Edge runtime
        const bcrypt = await import('bcryptjs')
        const valid  = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null

        return user
      },
    }),
  )
  return list
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret:   process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter:  PrismaAdapter(prisma),
  session:  { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
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
        token.isPro = await checkPro(user.email ?? '')
      }
      if (trigger === 'update') {
        token.isPro = await checkPro(token.email ?? '')
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
