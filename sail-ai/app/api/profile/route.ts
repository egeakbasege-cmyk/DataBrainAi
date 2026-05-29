/**
 * app/api/profile/route.ts — Business Profile Persistence
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/profile  → Return the authenticated user's persisted business profile.
 * PUT  /api/profile  → Upsert (create or update) the user's business profile.
 *
 * The profile stores: sector, metrics[], and optional diagnostic context.
 * These are injected into every AI prompt via BusinessContext.buildContext(),
 * giving Sail AI cross-session memory without the user re-entering constraints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'
import { prisma }                    from '@/lib/prisma'
import { Prisma }                    from '@prisma/client'

// ── GET — load profile ────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ profile: null }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ profile: null })

    const profile = await prisma.businessProfile.findUnique({
      where:  { userId: user.id },
      select: { sector: true, metrics: true, diagnostic: true, updatedAt: true },
    })

    return NextResponse.json({ profile })
  } catch (err: unknown) {
    console.error('[Profile GET]', err)
    return NextResponse.json({ profile: null })
  }
}

// ── PUT — upsert profile ──────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: { sector?: string; metrics?: unknown[]; diagnostic?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const metricsJson:    Prisma.InputJsonValue = (body.metrics    ?? []) as Prisma.InputJsonValue
    const diagnosticJson: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
      body.diagnostic ? (body.diagnostic as Prisma.InputJsonValue) : Prisma.JsonNull

    const updated = await prisma.businessProfile.upsert({
      where:  { userId: user.id },
      create: {
        userId:     user.id,
        sector:     body.sector     ?? '',
        metrics:    metricsJson,
        diagnostic: diagnosticJson,
      },
      update: {
        ...(body.sector     !== undefined && { sector:     body.sector     }),
        ...(body.metrics    !== undefined && { metrics:    metricsJson    }),
        ...(body.diagnostic !== undefined && { diagnostic: diagnosticJson }),
      },
      select: { sector: true, metrics: true, diagnostic: true, updatedAt: true },
    })

    return NextResponse.json({ profile: updated })
  } catch (err: unknown) {
    console.error('[Profile PUT]', err)
    return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  }
}

// ── DELETE — clear profile ────────────────────────────────────────────────────

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ ok: true })

    await prisma.businessProfile.deleteMany({ where: { userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[Profile DELETE]', err)
    return NextResponse.json({ error: 'Database error.' }, { status: 500 })
  }
}
