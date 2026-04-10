import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn      = !!auth?.user
      const protectedRoutes = ['/chat', '/onboarding']
      const isProtected     = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r))
      if (isProtected) return isLoggedIn
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
