/**
 * GET /api/health
 * Quick diagnostic — checks auth session and the resolved AI chat transport
 * (direct Cohere key pool OR Vercel AI Gateway fallback), then a live ping.
 * Returns a JSON object with every check so issues can be spotted instantly.
 *
 * Usage: open https://yourapp.vercel.app/api/health in browser while logged in.
 */

import { NextRequest }   from 'next/server'
import NextAuth          from 'next-auth'
import { authConfig }    from '@/auth.config'
import { buildProviderChain, cohereChatFetch, COHERE_MODELS } from '@/lib/clients/cohere'

export const runtime = 'edge'

// Edge-safe auth (JWT sessions, no DB adapter) — avoids pulling Prisma into edge.
const { auth } = NextAuth(authConfig)

export async function GET(_req: NextRequest) {
  const checks: Record<string, unknown> = {}

  // 1. Auth session
  const session = await auth()
  checks.auth = {
    ok:    !!session?.user?.email,
    email: session?.user?.email ?? null,
    isPro: session?.user?.isPro ?? false,
  }

  // 2. Provider cascade — the ordered failover chain every AI route uses:
  //    Cohere keys 0→1→2→3 → AI Gateway → Groq. Counts per provider so an
  //    exhausted tier is obvious at a glance.
  const chain = buildProviderChain()
  const byProvider = chain.reduce<Record<string, number>>((acc, a) => {
    acc[a.provider] = (acc[a.provider] ?? 0) + 1
    return acc
  }, {})
  checks.transport = {
    ok:       chain.length > 0,
    order:    chain.map(a => a.provider),
    byProvider,
    total:    chain.length,
  }

  // 3. Live ping — routed through the FULL cascade, so it stays healthy as long
  //    as ANY provider (Cohere / Gateway / Groq) can serve the request.
  if (chain.length > 0) {
    try {
      const t0  = Date.now()
      const res = await cohereChatFetch({
        model:       COHERE_MODELS.FAST,
        messages:    [{ role: 'user', content: 'Say "ok" in one word.' }],
        max_tokens:  4,
        temperature: 0,
      }, { timeoutMs: 15_000 })

      const data = await res.json().catch(() => ({}))
      checks.chatPing = {
        ok:     res.ok,
        status: res.status,
        ms:     Date.now() - t0,
        error:  res.ok ? null : ((data as Record<string, unknown>)?.error as Record<string, unknown>)?.message ?? res.statusText,
      }
    } catch (e) {
      checks.chatPing = { ok: false, error: String(e) }
    }
  } else {
    checks.chatPing = { ok: false, error: 'No AI provider configured (set COHERE_API_KEY, AI_GATEWAY_API_KEY, or GROQ_API_KEY)' }
  }

  const allOk = (checks.auth as Record<string,unknown>).ok &&
                (checks.transport as Record<string,unknown>).ok &&
                (checks.chatPing as Record<string,unknown>).ok

  return Response.json(
    { status: allOk ? 'healthy' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
