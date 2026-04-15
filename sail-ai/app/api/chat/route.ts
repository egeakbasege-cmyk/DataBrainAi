/**
 * Aetheris Pure Proxy — Edge Runtime
 *
 * This route is a zero-logic, zero-latency transparent proxy.
 * ALL intelligence, RAG retrieval, schema enforcement, and streaming
 * lives exclusively on the Railway backend.
 *
 * Responsibilities:
 *   1. Verify the session JWT (Edge-compatible via getToken).
 *   2. Attach Aetheris routing headers before forwarding.
 *   3. Pipe the upstream response body back unmodified.
 *
 * The middleware (middleware.ts) already rate-limits and guards this
 * route — redundant checks here are intentionally minimal.
 */

import { type NextRequest } from 'next/server'
import { getToken }         from 'next-auth/jwt'
import type { AetherisPayload } from '@/types/architecture'

export const runtime = 'edge'

const UPSTREAM_URL = process.env.RAILWAY_BACKEND_URL

export async function POST(req: NextRequest) {
  // ── 1. Session guard — Edge-compatible JWT verification ──────────────────
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  })

  if (!token?.email) {
    return Response.json(
      { error: 'Authentication required. Please sign in.' },
      { status: 401 },
    )
  }

  // ── 2. Upstream availability check ────────────────────────────────────────
  if (!UPSTREAM_URL) {
    return Response.json(
      { error: 'Upstream architecture offline.' },
      { status: 503 },
    )
  }

  // ── 3. Parse and validate payload shape ──────────────────────────────────
  let body: AetherisPayload
  try {
    body = (await req.json()) as AetherisPayload
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.message?.trim() && !body.imageBase64) {
    return Response.json({ error: 'Message is required.' }, { status: 422 })
  }

  // ── 4. Forward to Railway — zero transformation of the payload ────────────
  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM_URL}/api/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        // Backend-to-backend shared secret — never exposed to the browser
        'Authorization':     `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        // Aetheris routing headers
        'X-User-Email':       token.email as string,
        'X-Client-Language':  req.headers.get('X-Client-Language')  ?? body.language ?? 'en',
        'X-Aetheris-Session': req.headers.get('X-Aetheris-Session') ?? body.sessionId ?? 'init',
      },
      body: JSON.stringify(body),
    })
  } catch {
    return Response.json(
      { error: 'Proxy Forwarding Fault' },
      { status: 502 },
    )
  }

  // ── 5. Pipe upstream body back verbatim ───────────────────────────────────
  // Preserves streaming, status codes, and content-type without buffering.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type':      upstream.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
