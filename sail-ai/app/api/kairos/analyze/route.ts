import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { routeUrl }                  from '@/lib/kairos/router'
import { runShopifyWorker }          from '@/lib/kairos/workers/shopifyWorker'
import { runAmazonWorker }           from '@/lib/kairos/workers/amazonWorker'
import { runAnalysisEngine }         from '@/lib/kairos/ai/analysisEngine'
import { auth }                      from '@/auth'

export const runtime   = 'nodejs'
export const maxDuration = 120

// ── POST /api/kairos/analyze ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url?: string }
    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Classify URL
    let routed: ReturnType<typeof routeUrl>
    try { routed = routeUrl(url) } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    // Get session (optional — analysis works for anonymous users too)
    const session = await auth()
    const userId  = (session?.user as any)?.id ?? null

    // Create PENDING record
    const record = await prisma.kairosAnalysis.create({
      data: {
        userId,
        platform:   routed.platform,
        targetUrl:  routed.url,
        targetName: '',
        status:     'PENDING',
      },
    })

    // Run pipeline async (fire & return ID immediately for polling)
    runPipeline(record.id, routed).catch(async (err: Error) => {
      await prisma.kairosAnalysis.update({
        where: { id: record.id },
        data:  { status: 'ERROR', aiAnalysis: { error: err.message } },
      })
    })

    return NextResponse.json({ analysisId: record.id, platform: routed.platform, status: 'PENDING' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── GET /api/kairos/analyze?id=xxx ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')

  if (id) {
    const record = await prisma.kairosAnalysis.findUnique({ where: { id } })
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(record)
  }

  const recent = await prisma.kairosAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take:    20,
    select:  { id: true, platform: true, targetUrl: true, targetName: true, status: true, createdAt: true },
  })
  return NextResponse.json(recent)
}

// ── Pipeline runner ───────────────────────────────────────────────────────────

async function runPipeline(id: string, routed: ReturnType<typeof routeUrl>) {
  // 1. Scrape
  await prisma.kairosAnalysis.update({ where: { id }, data: { status: 'SCRAPING' } })

  let rawData: any
  let targetName: string

  if (routed.platform === 'SHOPIFY') {
    rawData    = await runShopifyWorker(routed.url)
    targetName = (rawData as any).storeName || routed.domain || routed.url
  } else {
    rawData    = await runAmazonWorker(routed.url)
    targetName = (rawData as any).title?.slice(0, 80) || routed.url
  }

  // 2. AI analysis
  await prisma.kairosAnalysis.update({
    where: { id },
    data:  { status: 'ANALYZING', targetName, rawData },
  })

  const aiAnalysis = await runAnalysisEngine(routed.platform, rawData)

  // 3. Complete
  await prisma.kairosAnalysis.update({
    where: { id },
    data:  { status: 'COMPLETE', aiAnalysis: aiAnalysis as any },
  })

  // 4. Cache top products
  if (routed.platform === 'SHOPIFY') {
    const topProducts = (rawData as any).topProducts?.slice(0, 5) ?? []
    for (const p of topProducts) {
      const handle = `shopify-${p.handle}`
      await prisma.kairosCachedProduct.upsert({
        where:  { asinOrHandle: handle },
        update: {
          title:                p.title,
          price:                parseFloat(p.variants[0]?.price ?? '0') || null,
          imageUrl:             p.images?.[0]?.src ?? null,
          supplierEstimatedCost: null,
        },
        create: {
          asinOrHandle: handle,
          platform:     'SHOPIFY',
          title:        p.title,
          price:        parseFloat(p.variants[0]?.price ?? '0') || null,
          imageUrl:     p.images?.[0]?.src ?? null,
        },
      })
    }
  }
}
