import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
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
