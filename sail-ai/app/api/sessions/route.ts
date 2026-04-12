import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'
import { prisma }                    from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ sessions: [] })
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
      const out      = a.output as any
      const headline = out?.headline ?? out?.signal ?? 'Strategy analysis'
      const target   = out?.target30 ?? ''
      return {
        id:        a.id,
        prompt:    a.sector,
        summary:   target ? `${headline} — ${target}` : headline,
        createdAt: a.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ sessions })
  } catch (err: any) {
    console.error('[Sessions GET] Error:', err.message)
    return NextResponse.json({ sessions: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    const { prompt, summary, sector, output } = await req.json()

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const analysis = await prisma.analysis.create({
      data: {
        userId:      user.id,
        isAnonymous: false,
        sector:      sector ?? prompt ?? 'Unknown',
        metrics:     {},
        output:      output ?? { headline: summary, signal: summary },
      },
      select: { id: true },
    })

    return NextResponse.json({ id: analysis.id })
  } catch (err: any) {
    console.error('[Sessions POST] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
