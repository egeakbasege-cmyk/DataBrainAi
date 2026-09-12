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
import { resolveChatTransport, COHERE_MODELS } from '@/lib/clients/cohere'

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

  // 2. Chat transport — reflects what the real chat routes actually use:
  //    direct Cohere keys if provisioned, otherwise the Vercel AI Gateway.
  const transport = resolveChatTransport()
  checks.transport = {
    ok:       transport.keys.length > 0,
    provider: transport.gateway ? 'ai-gateway' : (transport.keys.length > 0 ? 'cohere-direct' : 'none'),
    keyCount: transport.keys.length,
  }

  // 3. Live ping (tiny request to the fast model on the resolved transport)
  if (transport.keys.length > 0) {
    try {
      const t0  = Date.now()
      const res = await fetch(transport.url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${transport.keys[0]}`,
        },
        body: JSON.stringify({
          model:       transport.model(COHERE_MODELS.FAST),
          messages:    [{ role: 'user', content: 'Say "ok" in one word.' }],
          max_tokens:  4,
          temperature: 0,
        }),
      })

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
    checks.chatPing = { ok: false, error: 'No chat transport configured (set COHERE_API_KEY or AI_GATEWAY_API_KEY)' }
  }

  const allOk = (checks.auth as Record<string,unknown>).ok &&
                (checks.transport as Record<string,unknown>).ok &&
                (checks.chatPing as Record<string,unknown>).ok

  return Response.json(
    { status: allOk ? 'healthy' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
