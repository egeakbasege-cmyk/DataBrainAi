import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

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

        try {
          const res = await fetch(`${BACKEND}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              email:    credentials.email,
              password: credentials.password,
            }),
            signal: AbortSignal.timeout(10_000), // 10s timeout
          })

          if (!res.ok) return null

          const data = await res.json()
          return {
            id:          data.user_id,
            email:       data.email,
            accessToken: data.access_token,
            credits:     data.credits,
            freeUsed:    data.free_used,
          }
        } catch {
          return null
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
  },
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
