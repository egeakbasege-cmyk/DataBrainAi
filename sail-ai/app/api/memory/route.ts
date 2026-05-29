/**
 * app/api/memory/route.ts — Semantic Memory REST Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/memory — Save an analysis to semantic memory
 * GET  /api/memory?query=...  — Recall relevant past analyses
 *
 * Both routes require authentication.
 * Gracefully returns empty results if Pinecone/Cohere are not configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'
import { prisma }                    from '@/lib/prisma'
import { saveAnalysis, recallRelevant, formatMemoryContext } from '@/lib/vector/memory'

// ── GET — recall relevant memories ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ memories: [], context: '' }, { status: 401 })
  }

  const query = req.nextUrl.searchParams.get('query')?.trim()
  if (!query || query.length < 3) {
    return NextResponse.json({ memories: [], context: '' })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ memories: [], context: '' })

    const memories = await recallRelevant(user.id, query)
    const context  = formatMemoryContext(memories)

    return NextResponse.json({ memories, context })
  } catch (err) {
    console.error('[Memory GET]', err)
    return NextResponse.json({ memories: [], context: '' })
  }
}

// ── POST — save an analysis ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: {
    sessionId: string
    query:     string
    summary:   string
    mode?:     string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 })
  }

  if (!body.sessionId || !body.query || !body.summary) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 })

    const ok = await saveAnalysis(
      user.id,
      body.sessionId,
      body.query,
      body.summary,
      body.mode ?? 'upwind',
    )

    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[Memory POST]', err)
    return NextResponse.json({ ok: false })
  }
}
