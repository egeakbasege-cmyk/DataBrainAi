import NextAuth             from 'next-auth'
import { NextResponse }     from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig }       from './auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req: NextRequest & { auth?: any }) => {
  const res = NextResponse.next()

  // ── Security headers ─────────────────────────────────────────
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https://*.googleusercontent.com",
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')

  res.headers.set('Content-Security-Policy',  csp)
  res.headers.set('X-Content-Type-Options',   'nosniff')
  res.headers.set('X-Frame-Options',          'DENY')
  res.headers.set('X-XSS-Protection',         '1; mode=block')
  res.headers.set('Referrer-Policy',          'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy',       'camera=(), microphone=(), geolocation=()')

  // ── CORS for API routes ──────────────────────────────────────
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'
    res.headers.set('Access-Control-Allow-Origin',  origin)
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // ── Guard AI + billing endpoints at middleware level ─────────
  const guarded = ['/api/chat', '/api/checkout']
  if (guarded.some((p) => req.nextUrl.pathname.startsWith(p)) && !req.auth) {
    return NextResponse.json(
      { error: 'Please sign in to use Sail AI.' },
      { status: 401 },
    )
  }

  return res
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
