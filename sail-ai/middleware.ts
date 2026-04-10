import NextAuth             from 'next-auth'
import { NextResponse }     from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig }       from './auth.config'

const { auth } = NextAuth(authConfig)

// ── Edge rate limiter ─────────────────────────────────────────────
// Keyed by identity (email for authed, IP for anonymous).
// NOTE: Per-Edge-instance memory — for globally-consistent limits
// replace this Map with @upstash/redis + Sliding Window algorithm.
const rateMap = new Map<string, { count: number; reset: number }>()

const RATE_CONFIG: Record<string, { limit: number; window: number }> = {
  ai:   { limit: 10, window: 60_000 },   // AI routes: 10 req/min
  auth: { limit: 8,  window: 60_000 },   // Auth routes: 8 req/min (brute-force guard)
}

function getIdentity(req: NextRequest, session: any): string {
  if (session?.user?.email) return `email:${session.user.email}`
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  return `ip:${ip}`
}

function checkRate(key: string, tier: keyof typeof RATE_CONFIG): boolean {
  const { limit, window } = RATE_CONFIG[tier]
  const now   = Date.now()
  const entry = rateMap.get(key)

  // Prune stale entries to keep the Map lean
  if (rateMap.size > 5_000) {
    rateMap.forEach((v, k) => { if (now > v.reset) rateMap.delete(k) })
  }

  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + window })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── Main middleware ───────────────────────────────────────────────
export default auth((req: NextRequest & { auth?: any }) => {
  const path = req.nextUrl.pathname

  // ── Rate limiting ────────────────────────────────────────────
  const identity = getIdentity(req, req.auth)

  const isAiRoute   = path.startsWith('/api/chat') || path.startsWith('/api/analyze')
  const isAuthRoute = path.startsWith('/api/auth/register')

  if (isAiRoute && !checkRate(`ai:${identity}`, 'ai')) {
    return NextResponse.json(
      {
        statusCode: 429,
        errorCode:  'RATE_LIMIT_EXCEEDED',
        message:    'Too many requests. Please wait a moment before trying again.',
      },
      {
        status:  429,
        headers: { 'Retry-After': '60' },
      },
    )
  }

  if (isAuthRoute && !checkRate(`auth:${identity}`, 'auth')) {
    return NextResponse.json(
      {
        statusCode: 429,
        errorCode:  'RATE_LIMIT_EXCEEDED',
        message:    'Too many sign-up attempts. Please try again in a minute.',
      },
      {
        status:  429,
        headers: { 'Retry-After': '60' },
      },
    )
  }

  // ── Auth guard for protected API endpoints ───────────────────
  const guarded = ['/api/chat', '/api/analyze', '/api/checkout']
  if (guarded.some((p) => path.startsWith(p)) && !req.auth) {
    return NextResponse.json(
      { statusCode: 401, errorCode: 'UNAUTHORIZED', message: 'Please sign in to use Sail AI.' },
      { status: 401 },
    )
  }

  // ── Security headers ─────────────────────────────────────────
  const res = NextResponse.next()

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

  // ── CORS ─────────────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'
    res.headers.set('Access-Control-Allow-Origin',  origin)
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return res
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
