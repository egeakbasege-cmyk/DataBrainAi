/**
 * GET /api/health
 * Quick diagnostic — checks auth session, Groq key pool, and a live ping.
 * Returns a JSON object with every check so issues can be spotted instantly.
 *
 * Usage: open https://yourapp.vercel.app/api/health in browser while logged in.
 */

import { NextRequest }   from 'next/server'
import { auth }          from '@/lib/auth'
import { buildKeyPool }  from '@/lib/clients/groq'

export const runtime = 'edge'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function GET(_req: NextRequest) {
  const checks: Record<string, unknown> = {}

  // 1. Auth session
  const session = await auth()
  checks.auth = {
    ok:    !!session?.user?.email,
    email: session?.user?.email ?? null,
    isPro: session?.user?.isPro ?? false,
  }

  // 2. Key pool
  const keys = buildKeyPool()
  checks.keyPool = {
    count:     keys.length,
    ok:        keys.length > 0,
    prefixes:  keys.map(k => k.slice(0, 8) + '…'),
  }

  // 3. Live Groq ping (tiny request to cheapest model)
  if (keys.length > 0) {
    try {
      const t0  = Date.now()
      const res = await fetch(GROQ_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${keys[0]}`,
        },
        body: JSON.stringify({
          model:       'llama-3.1-8b-instant',
          messages:    [{ role: 'user', content: 'Say "ok" in one word.' }],
          max_tokens:  4,
          temperature: 0,
        }),
      })

      const data = await res.json().catch(() => ({}))
      checks.groqPing = {
        ok:       res.ok,
        status:   res.status,
        ms:       Date.now() - t0,
        reply:    (data as Record<string, unknown>)?.choices?.toString?.() ?? null,
        error:    res.ok ? null : ((data as Record<string, unknown>)?.error as Record<string, unknown>)?.message ?? res.statusText,
      }

      // 4. Check primary model too
      if (res.ok) {
        const t1   = Date.now()
        const res2 = await fetch(GROQ_URL, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${keys[0]}`,
          },
          body: JSON.stringify({
            model:       'llama-3.3-70b-versatile',
            messages:    [{ role: 'user', content: 'Say "ok" in one word.' }],
            max_tokens:  4,
            temperature: 0,
          }),
        })
        const data2 = await res2.json().catch(() => ({}))
        checks.groqPrimaryModel = {
          ok:     res2.ok,
          status: res2.status,
          ms:     Date.now() - t1,
          error:  res2.ok ? null : ((data2 as Record<string, unknown>)?.error as Record<string, unknown>)?.message ?? res2.statusText,
        }
      }
    } catch (e) {
      checks.groqPing = { ok: false, error: String(e) }
    }
  } else {
    checks.groqPing = { ok: false, error: 'No keys in pool' }
  }

  const allOk = (checks.auth as Record<string,unknown>).ok &&
                (checks.keyPool as Record<string,unknown>).ok &&
                (checks.groqPing as Record<string,unknown>).ok

  return Response.json(
    { status: allOk ? 'healthy' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
