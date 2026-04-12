import { NextResponse } from 'next/server'
import { auth }         from '@/auth'
import { prisma }       from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ sessions: [] })
  }

  try {
    const analyses = await prisma.analysis.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select:  { id: true, sector: true, output: true, createdAt: true },
    })

    const sessions = analyses.map(a => {
      const out     = a.output as any
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
    console.error('[Sessions] Error:', err.message)
    return NextResponse.json({ sessions: [] })
  }
}
