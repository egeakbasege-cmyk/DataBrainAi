import NextAuth             from 'next-auth'
import { NextResponse }     from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig }       from './auth.config'
import { Ratelimit }        from '@upstash/ratelimit'
import { Redis }            from '@upstash/redis'

const { auth } = NextAuth(authConfig)

// ── Allowed CORS origin ───────────────────────────────────────────────────────
// Server-side env var only — never derived from request headers
const ALLOWED_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  'https://sail-ai.com'
).replace(/\/$/, '')

// ── Rate limiter ──────────────────────────────────────────────────────────────
//
// Two-tier strategy:
//   • Tier 1 (preferred): Upstash Redis — globally-consistent sliding window.
//   • Tier 2 (fallback):  per-instance in-memory Map — zero config, single-region.

const RATE_CONFIG: Record<string, { limit: number; window: number }> = {
  ai:   { limit: 30, window: 60_000 },  // AI inference: 30 req/min
  api:  { limit: 30, window: 60_000 },  // General API: 30 req/min
  auth: { limit: 8,  window: 60_000 },  // Auth / register: 8 req/min
}

// Upstash Redis rate limiters — instantiated only when env vars are present
let upstashAi:   Ratelimit | null = null
let upstashApi:  Ratelimit | null = null
let upstashAuth: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  upstashAi   = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_CONFIG.ai.limit,   '60 s'), prefix: 'rl:ai'   })
  upstashApi  = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_CONFIG.api.limit,  '60 s'), prefix: 'rl:api'  })
  upstashAuth = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_CONFIG.auth.limit, '60 s'), prefix: 'rl:auth' })
}

// In-memory fallback
const rateMap = new Map<string, { count: number; reset: number }>()

function checkRateMemory(key: string, tier: keyof typeof RATE_CONFIG): boolean {
  const { limit, window } = RATE_CONFIG[tier]
  const now   = Date.now()
  const entry = rateMap.get(key)
  if (rateMap.size > 5_000) {
    rateMap.forEach((v, k) => { if (now > v.reset) rateMap.delete(k) })
  }
  if (!entry || now > entry.reset) { rateMap.set(key, { count: 1, reset: now + window }); return true }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

async function checkRate(key: string, tier: keyof typeof RATE_CONFIG): Promise<boolean> {
  const limiter = tier === 'ai' ? upstashAi : tier === 'auth' ? upstashAuth : upstashApi
  if (limiter) { const { success } = await limiter.limit(key); return success }
  return checkRateMemory(key, tier)
}

// ── Identity — session email preferred; IP as fallback (first hop only) ───────
function getIdentity(req: NextRequest, session: { user?: { email?: string | null } } | null): string {
  if (session?.user?.email) return `email:${session.user.email}`
  // Take ONLY the first address from x-forwarded-for (leftmost = client).
  // Any addresses appended by intermediate proxies are ignored.
  const xfwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip   = req.headers.get('x-real-ip') ?? xfwd ?? 'unknown'
  return `ip:${ip}`
}

// ── Rate-limit helper ─────────────────────────────────────────────────────────
function rateLimitResponse(retryAfter = 60): NextResponse {
  return NextResponse.json(
    { statusCode: 429, errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait a moment.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

// ── Main middleware ───────────────────────────────────────────────────────────

export default auth(async (req: NextRequest & { auth?: { user?: { email?: string | null } } | null }) => {
  const path = req.nextUrl.pathname

  // ── CORS preflight (OPTIONS) ─────────────────────────────────────────────
  if (req.method === 'OPTIONS' && path.startsWith('/api/')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age':       '86400',
      },
    })
  }

  const identity = getIdentity(req, req.auth ?? null)

  // ── Route-level rate limiting ─────────────────────────────────────────────
  // AI inference routes — strict limit
  if (
    path.startsWith('/api/chat') ||
    path.startsWith('/api/analyze') ||
    path.startsWith('/api/research') ||
    path.startsWith('/api/kairos') ||
    path.startsWith('/api/downwind')
  ) {
    if (!(await checkRate(`ai:${identity}`, 'ai'))) return rateLimitResponse()
  }

  // General authenticated API routes — moderate limit
  else if (
    path.startsWith('/api/memory') ||
    path.startsWith('/api/sessions') ||
    path.startsWith('/api/profile') ||
    path.startsWith('/api/export') ||
    path.startsWith('/api/feedback') ||
    path.startsWith('/api/data-lab') ||
    path.startsWith('/api/checkout')
  ) {
    if (!(await checkRate(`api:${identity}`, 'api'))) return rateLimitResponse()
  }

  // Auth routes — brute-force guard
  else if (path.startsWith('/api/auth/register')) {
    if (!(await checkRate(`auth:${identity}`, 'auth'))) return rateLimitResponse()
  }

  // ── Auth guard — all protected API endpoints ──────────────────────────────
  const guarded = [
    '/api/chat',
    '/api/analyze',
    '/api/checkout',
    '/api/memory',
    '/api/sessions',
    '/api/profile',
    '/api/export',
    '/api/feedback',
    '/api/research',
    '/api/data-lab',
    '/api/kairos',
    '/api/downwind',
  ]
  if (guarded.some((p) => path.startsWith(p)) && !req.auth) {
    return NextResponse.json(
      { statusCode: 401, errorCode: 'UNAUTHORIZED', message: 'Please sign in to use Sail AI.' },
      { status: 401 },
    )
  }

  // ── Security headers ──────────────────────────────────────────────────────
  const res = NextResponse.next()

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https://*.googleusercontent.com https://images.unsplash.com",
    [
      "connect-src 'self'",
      "https://api.groq.com",
      "https://api.cohere.ai",
      "https://api.tavily.com",
      "https://google.serper.dev",
      "https://generativelanguage.googleapis.com",
      "https://api.lemonsqueezy.com",
      "https://api.dodopayments.com",
      "https://live.dodopayments.com",
      "https://test.dodopayments.com",
      "https://api.resend.com",
      "https://*.upstash.io",
      "https://*.pinecone.io",
      "https://*.sentry.io",
      "https://vitals.vercel-insights.com",
    ].join(' '),
    "frame-src https://js.stripe.com https://hooks.stripe.com https://lemonsqueezy.com https://live.dodopayments.com https://test.dodopayments.com",
    // Checkout is a top-level redirect to the merchant of record, so the
    // payment host must be an allowed form-action target.
    "form-action 'self' https://live.dodopayments.com https://test.dodopayments.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')

  res.headers.set('Content-Security-Policy',           csp)
  res.headers.set('X-Content-Type-Options',            'nosniff')
  res.headers.set('X-Frame-Options',                   'DENY')
  res.headers.set('X-XSS-Protection',                  '1; mode=block')
  res.headers.set('Referrer-Policy',                   'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy',                'camera=(), microphone=(self), geolocation=()')
  res.headers.set('Strict-Transport-Security',         'max-age=63072000; includeSubDomains; preload')

  // ── CORS — server-side origin, not client-supplied header ─────────────────
  if (path.startsWith('/api/')) {
    res.headers.set('Access-Control-Allow-Origin',  ALLOWED_ORIGIN)
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.headers.set('Vary',                         'Origin')
  }

  return res
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
