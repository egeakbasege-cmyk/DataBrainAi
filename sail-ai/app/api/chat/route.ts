import { NextRequest } from 'next/server'
import { auth }        from '@/auth'
import type { ChatPayload } from '@/types/chat'

/**
 * Transparent proxy — no AI logic, no RAG logic, no business logic.
 *
 * Responsibilities:
 *  1. Authenticate the session (Vercel owns auth).
 *  2. Forward the exact payload to the Railway backend.
 *  3. Pipe the upstream Response body back to the client unmodified.
 *     Streaming, status codes, and errors are preserved as-is.
 *
 * Railway owns: benchmark retrieval, agent routing, tool calling,
 * Anthropic calls, error recovery, and multi-agent orchestration.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json(
      { error: 'Please sign in to use Sail AI.' },
      { status: 401 },
    )
  }

  const backendUrl = process.env.RAILWAY_BACKEND_URL
  if (!backendUrl) {
    return Response.json(
      { error: 'Backend service unavailable. Please try again shortly.' },
      { status: 503 },
    )
  }

  let payload: ChatPayload
  try {
    payload = (await req.json()) as ChatPayload
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${backendUrl}/api/ai/chat`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': session.user.email,
        ...(req.headers.get('x-forwarded-for')
          ? { 'X-Forwarded-For': req.headers.get('x-forwarded-for') as string }
          : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return Response.json(
      { error: 'Backend service temporarily unavailable. Please try again in a moment.' },
      { status: 502 },
    )
  }

  // Pipe upstream body back without modification — preserves streaming, status, and errors.
  return new Response(upstream.body, {
    status:  upstream.status,
    headers: {
      'Content-Type':      upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
