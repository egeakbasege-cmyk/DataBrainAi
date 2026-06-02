/**
 * app/api/edge-agents/memory-sync/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * RAG Memory Sync — Vercel Edge Runtime
 *
 * Receives a content string + source_type, generates an embedding via
 * Supabase's edge function proxy, and upserts a memory_documents row.
 *
 * Also exposes GET for similarity search (RAG retrieval).
 *
 * Security:
 *   • Session-gated: user_id is always derived from the server-side session
 *   • Never accepts user_id from the request body
 */

export const runtime = 'edge'

import { auth } from '@/auth'

// ── Helpers ───────────────────────────────────────────────────────────────────

function supabaseHeaders(serviceKey: string) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey':        serviceKey,
  }
}

async function getEmbedding(
  supabaseUrl: string,
  serviceKey:  string,
  text:        string,
): Promise<number[] | null> {
  const res = await fetch(`${supabaseUrl}/functions/v1/embed`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body:    JSON.stringify({ text: text.slice(0, 1024) }),
  }).catch(() => null)

  if (!res?.ok) return null
  return res.json()
    .then((d: { embedding?: number[] }) => d.embedding ?? null)
    .catch(() => null)
}

// ── POST — write memory document ──────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const userId = session.user.email

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Memory service not configured' }), {
      status:  503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { content?: string; source_type?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { content, source_type = 'user_input' } = body
  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: 'content is required' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const embedding = await getEmbedding(supabaseUrl, serviceKey, content)

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/memory_documents`, {
    method:  'POST',
    headers: {
      ...supabaseHeaders(serviceKey),
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ user_id: userId, content, source_type, embedding }),
  })

  if (!insertRes.ok) {
    const detail = await insertRes.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'Memory write failed', detail }), {
      status:  502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const [row] = await insertRes.json().catch(() => [null]) as [{ id?: string } | null]
  return new Response(JSON.stringify({ id: row?.id ?? null, embedded: !!embedding }), {
    status:  201,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── GET — similarity search ───────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const userId = session.user.email

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Memory service not configured' }), {
      status:  503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { searchParams } = new URL(req.url)
  const query     = searchParams.get('q') ?? ''
  const threshold = parseFloat(searchParams.get('threshold') ?? '0.75')
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 20)

  if (!query.trim()) {
    return new Response(JSON.stringify({ error: 'q param required' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const embedding = await getEmbedding(supabaseUrl, serviceKey, query)
  if (!embedding) {
    // Embedding unavailable — return empty (full-text fallback TBD)
    return new Response(JSON.stringify({ results: [], fallback: true }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_memory`, {
    method:  'POST',
    headers: supabaseHeaders(serviceKey),
    body:    JSON.stringify({
      p_user_id:       userId,
      query_embedding: embedding,
      match_threshold: threshold,
      match_count:     limit,
    }),
  })

  if (!rpcRes.ok) {
    const detail = await rpcRes.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'Memory search failed', detail }), {
      status:  502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results = await rpcRes.json().catch(() => [])
  return new Response(JSON.stringify({ results }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
}
