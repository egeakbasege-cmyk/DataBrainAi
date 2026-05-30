import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'
import { prisma }                    from '@/lib/prisma'

// ── Input limits ──────────────────────────────────────────────────────────────
const MAX_PROMPT  = 500
const MAX_SUMMARY = 500
const MAX_SECTOR  = 200

// ── GET — fetch session history ───────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    // Return 401, not 200, so clients can detect auth failures correctly
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })

    if (!user) return NextResponse.json({ sessions: [] })

    const analyses = await prisma.analysis.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select:  { id: true, sector: true, output: true, createdAt: true },
    })

    const sessions = analyses.map(a => {
      const out = (a.output && typeof a.output === 'object') ? a.output as Record<string, unknown> : {}
      const headline = (out?.headline ?? out?.signal ?? 'Strategy analysis') as string
      const target   = (out?.target30 ?? '') as string
      return {
        id:        a.id,
        prompt:    a.sector,
        summary:   target ? `${headline} — ${target}` : headline,
        createdAt: a.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ sessions })
  } catch (err) {
    // Never expose Prisma error messages (they contain schema/column info)
    console.error('[Sessions GET] Error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ sessions: [] })
  }
}

// ── POST — save a session ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { prompt, summary, sector, output } = body as Record<string, unknown>

  // Input validation — prevent oversized or wrong-type payloads
  if (typeof prompt  !== 'string' && typeof prompt  !== 'undefined') return NextResponse.json({ error: 'Invalid prompt.'  }, { status: 400 })
  if (typeof summary !== 'string' && typeof summary !== 'undefined') return NextResponse.json({ error: 'Invalid summary.' }, { status: 400 })
  if (typeof sector  !== 'string' && typeof sector  !== 'undefined') return NextResponse.json({ error: 'Invalid sector.'  }, { status: 400 })

  const promptStr  = (typeof prompt  === 'string' ? prompt  : '').slice(0, MAX_PROMPT)
  const summaryStr = (typeof summary === 'string' ? summary : '').slice(0, MAX_SUMMARY)
  const sectorStr  = (typeof sector  === 'string' ? sector  : promptStr).slice(0, MAX_SECTOR)

  // Only allow plain objects for the output blob (no arrays, no primitives)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeOutput: any = (output && typeof output === 'object' && !Array.isArray(output))
    ? output
    : { headline: summaryStr, signal: summaryStr }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const analysis = await prisma.analysis.create({
      data: {
        userId:      user.id,
        isAnonymous: false,
        sector:      sectorStr || 'Unknown',
        metrics:     {},
        output:      safeOutput,
      },
      select: { id: true },
    })

    return NextResponse.json({ id: analysis.id })
  } catch (err) {
    // Return a generic message — never Prisma error strings
    console.error('[Sessions POST] Error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to save session.' }, { status: 500 })
  }
}
