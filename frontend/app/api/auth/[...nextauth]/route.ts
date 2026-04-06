import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const BACKEND = process.env.BACKEND_URL

if (!BACKEND) {
  console.error('[nextauth] BACKEND_URL is not set — login will fail.')
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        if (!BACKEND) {
          console.error('[nextauth] authorize: BACKEND_URL not configured')
          throw new Error('Server configuration error. Contact support.')
        }

        let res: Response
        try {
          res = await fetch(`${BACKEND}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              email:    credentials.email,
              password: credentials.password,
            }),
            signal: AbortSignal.timeout(10_000),
          })
        } catch (err: any) {
          const isNetwork = err?.code === 'ECONNREFUSED' ||
            err?.name === 'TimeoutError' ||
            err?.cause?.code === 'ECONNREFUSED'
          console.error('[nextauth] authorize: backend unreachable:', err?.message)
          throw new Error(
            isNetwork
              ? 'Cannot reach server. Please try again in a moment.'
              : 'Login failed. Please try again.'
          )
        }

        if (res.status === 401) return null   // wrong password — let NextAuth show standard error

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || data.error || 'Login failed. Please try again.')
        }

        const data = await res.json()
        return {
          id:          data.user_id,
          email:       data.email,
          accessToken: data.access_token,
          credits:     data.credits,
          freeUsed:    data.free_used,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId      = (user as any).id
        token.accessToken = (user as any).accessToken
        token.credits     = (user as any).credits
        token.freeUsed    = (user as any).freeUsed
      }
      return token
    },
    async session({ session, token }) {
      session.user = session.user || {}
      ;(session as any).userId      = token.userId
      ;(session as any).accessToken = token.accessToken
      ;(session as any).credits     = token.credits
      ;(session as any).freeUsed    = token.freeUsed
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error:  '/auth/signin',
  },
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
