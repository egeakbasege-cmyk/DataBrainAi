import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import prisma                        from '@/lib/db'
import { routeUrl }                  from '@/lib/router'
import { runShopifyWorker }          from '@/lib/workers/shopifyWorker'
import { runAmazonWorker }           from '@/lib/workers/amazonWorker'
import { runAnalysisEngine }         from '@/lib/ai/analysisEngine'
import type { Platform }             from '@/types'

export const runtime = 'nodejs'   // cheerio + axios require Node.js runtime
export const maxDuration = 120    // 2-minute timeout for scrape + AI

// ── Request schema ────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  url:    z.string().url('Please enter a valid URL'),
  userId: z.string().optional(),
})

// ── POST /api/analyze ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse & validate input
  let body: z.infer<typeof RequestSchema>
  try {
    const json = await req.json()
    body = RequestSchema.parse(json)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors?.[0]?.message ?? 'Invalid request body.' },
      { status: 400 },
    )
  }

  // 2. Route the URL
  let routerResult: ReturnType<typeof routeUrl>
  try {
    routerResult = routeUrl(body.url)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const platform: Platform = routerResult.platform

  // 3. Create a pending analysis record
  let record = await prisma.analysisResult.create({
    data: {
      userId:    body.userId ?? null,
      platform,
      targetUrl: routerResult.url,
      status:    'SCRAPING',
    },
  })

  try {
    // 4. Scrape
    const rawData = platform === 'SHOPIFY'
      ? await runShopifyWorker(routerResult.url)
      : await runAmazonWorker(routerResult.url)

    const targetName = platform === 'SHOPIFY'
      ? (rawData as any).storeName
      : (rawData as any).title

    // Update to ANALYZING state
    record = await prisma.analysisResult.update({
      where: { id: record.id },
      data:  { status: 'ANALYZING', rawData: rawData as any, targetName },
    })

    // 5. AI analysis
    const aiAnalysis = await runAnalysisEngine(platform, rawData)

    // 6. Persist complete result
    record = await prisma.analysisResult.update({
      where: { id: record.id },
      data:  { status: 'COMPLETE', aiAnalysis: aiAnalysis as any },
    })

    // 7. Upsert cached products for quick future lookups
    if (platform === 'SHOPIFY') {
      const shopifyData = rawData as any
      const upserts = shopifyData.topProducts?.slice(0, 10).map((p: any) =>
        prisma.cachedProduct.upsert({
          where:  { asinOrHandle: p.handle },
          create: {
            asinOrHandle:          p.handle,
            platform:              'SHOPIFY',
            title:                 p.title,
            price:                 parseFloat(p.variants?.[0]?.price ?? '0') || null,
            imageUrl:              p.images?.[0]?.src ?? null,
            supplierEstimatedCost: null,
          },
          update: {
            title:    p.title,
            price:    parseFloat(p.variants?.[0]?.price ?? '0') || null,
            imageUrl: p.images?.[0]?.src ?? null,
          },
        }),
      ) ?? []
      await Promise.allSettled(upserts)
    } else {
      const amazonData = rawData as any
      await prisma.cachedProduct.upsert({
        where:  { asinOrHandle: amazonData.asin },
        create: {
          asinOrHandle:          amazonData.asin,
          platform:              'AMAZON',
          title:                 amazonData.title,
          price:                 amazonData.price,
          imageUrl:              amazonData.imageUrls?.[0] ?? null,
          supplierEstimatedCost: amazonData.price ? amazonData.price * 0.15 : null,
          rating:                amazonData.rating,
          reviewCount:           amazonData.reviewCount,
        },
        update: {
          title:       amazonData.title,
          price:       amazonData.price,
          rating:      amazonData.rating,
          reviewCount: amazonData.reviewCount,
        },
      }).catch(() => null)   // non-fatal
    }

    return NextResponse.json({
      analysisId: record.id,
      platform,
      status:     'COMPLETE',
    })

  } catch (err: any) {
    // Mark analysis as errored
    await prisma.analysisResult.update({
      where: { id: record.id },
      data:  { status: 'ERROR' },
    }).catch(() => null)

    console.error('[/api/analyze] Error:', err.message)
    return NextResponse.json(
      { error: err.message ?? 'Analysis failed. Please try again.' },
      { status: 500 },
    )
  }
}

// ── GET /api/analyze?id=... ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    // Return recent analyses (last 20)
    const recent = await prisma.analysisResult.findMany({
      orderBy: { createdAt: 'desc' },
      take:    20,
      select: {
        id: true, platform: true, targetUrl: true, targetName: true,
        status: true, createdAt: true,
      },
    })
    return NextResponse.json({ analyses: recent })
  }

  const record = await prisma.analysisResult.findUnique({ where: { id } })
  if (!record) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 })
  }

  return NextResponse.json(record)
}
