import NextAuth             from 'next-auth'
import { NextResponse }     from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig }       from './auth.config'

const { auth } = NextAuth(authConfig)

// ── Edge rate limiter ─────────────────────────────────────────────
// Primary: @upstash/ratelimit (globally consistent across Edge instances).
// Fallback: per-instance in-memory Map (activates silently when Upstash
//   env vars are missing or the package is not installed).
//
// To enable Upstash, set in Vercel env:
//   UPSTASH_REDIS_REST_URL   — from Upstash dashboard → REST API
//   UPSTASH_REDIS_REST_TOKEN — from Upstash dashboard → REST API

const RATE_CONFIG: Record<string, { limit: number; window: number }> = {
  ai:   { limit: 10, window: 60_000 },   // AI routes: 10 req/min
  auth: { limit: 8,  window: 60_000 },   // Auth routes: 8 req/min (brute-force guard)
}

// ── Upstash lazy singleton ─────────────────────────────────────────
// Initialised once on first request; null if Upstash is unavailable.
// Uses dynamic import so the build never hard-fails when the package
// is absent — the in-memory Map silently takes over instead.
let _upstashChecker: ((id: string) => Promise<boolean>) | null = null
let _upstashAttempted = false

async function getUpstashChecker(): Promise<((id: string) => Promise<boolean>) | null> {
  if (_upstashAttempted) return _upstashChecker
  _upstashAttempted = true

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore — optional peer dep; not installed → caught below
    const { Ratelimit } = await import('@upstash/ratelimit')
    // @ts-ignore — optional peer dep; not installed → caught below
    const { Redis } = await import('@upstash/redis')
    /* eslint-enable @typescript-eslint/ban-ts-comment */
    const redis   = new Redis({ url, token })
    const limiter = new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(10, '60 s'),
      analytics: false,
    })
    _upstashChecker = async (id: string) => {
      const { success } = await limiter.limit(id)
      return success
    }
  } catch {
    // Package not installed or Redis unreachable — fall through to in-memory
    _upstashChecker = null
  }
  return _upstashChecker
}

// ── In-memory fallback Map ─────────────────────────────────────────
const rateMap = new Map<string, { count: number; reset: number }>()

function checkRateInMemory(key: string, tier: keyof typeof RATE_CONFIG): boolean {
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

async function checkRate(key: string, tier: keyof typeof RATE_CONFIG): Promise<boolean> {
  const upstash = await getUpstashChecker()
  if (upstash) {
    try {
      return await upstash(`${tier}:${key}`)
    } catch {
      // Upstash call failed mid-flight — fall through to in-memory silently
    }
  }
  return checkRateInMemory(key, tier)
}

function getIdentity(req: NextRequest, session: any): string {
  if (session?.user?.email) return `email:${session.user.email}`
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  return `ip:${ip}`
}

// ── Main middleware ───────────────────────────────────────────────
export default auth(async (req: NextRequest & { auth?: any }) => {
  const path = req.nextUrl.pathname

  // ── Rate limiting ────────────────────────────────────────────
  const identity = getIdentity(req, req.auth)

  const isAiRoute   = path.startsWith('/api/chat') || path.startsWith('/api/analyze')
  const isAuthRoute = path.startsWith('/api/auth/register')

  if (isAiRoute && !(await checkRate(`ai:${identity}`, 'ai'))) {
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

  if (isAuthRoute && !(await checkRate(`auth:${identity}`, 'auth'))) {
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
