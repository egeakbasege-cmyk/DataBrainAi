import { NextRequest, NextResponse } from 'next/server'
import Anthropic                      from '@anthropic-ai/sdk'
import prisma                         from '@/lib/db'
import type { ChatMessage }           from '@/types'

export const runtime    = 'nodejs'
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── POST /api/chat ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.analysisId || !body?.message) {
    return NextResponse.json({ error: 'analysisId and message are required.' }, { status: 400 })
  }

  const { analysisId, message, history = [] } = body as {
    analysisId: string
    message:    string
    history:    ChatMessage[]
  }

  // Load the analysis for context
  const analysis = await prisma.analysisResult.findUnique({ where: { id: analysisId } })
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 })
  }

  const contextSummary = buildContextSummary(analysis)

  // Build the conversation stream
  const stream = await client.messages.stream({
    model:       'claude-opus-4-5',
    max_tokens:  1024,
    temperature: 0.5,
    system: `You are KAIROS — an elite e-commerce intelligence copilot. You have access to a detailed analysis of the following ${analysis.platform} ${analysis.platform === 'SHOPIFY' ? 'store' : 'product'}:

${contextSummary}

Answer the user's questions using the data above. Provide specific, actionable answers. When asked about strategy, be precise and data-driven. Format responses in clear markdown.`,
    messages: [
      ...history.slice(-10).map(m => ({
        role:    m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
  })

  // Stream the response as SSE
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            ctrl.enqueue(encoder.encode(event.delta.text))
          }
        }
        ctrl.close()
      } catch (err) {
        ctrl.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

// ── Context summariser ────────────────────────────────────────────────────────

function buildContextSummary(analysis: any): string {
  const raw = analysis.rawData as any
  const ai  = analysis.aiAnalysis as any

  if (analysis.platform === 'SHOPIFY') {
    return `
STORE: ${raw?.storeName ?? analysis.targetName} (${raw?.storeDomain ?? ''})
PRODUCTS: ${raw?.totalProducts ?? 'unknown'} total
PRICE RANGE: $${raw?.priceRange?.min ?? '?'} – $${raw?.priceRange?.max ?? '?'}
TOP TAGS: ${Object.entries(raw?.tagFrequency ?? {}).slice(0, 10).map(([t, c]) => `${t}(${c})`).join(', ')}

AI ANALYSIS SUMMARY: ${ai?.summary ?? ''}
COMPETITOR SCORE: ${ai?.competitorScore ?? '?'}/100
VULNERABILITIES: ${ai?.vulnerabilities?.map((v: any) => `${v.category}: ${v.finding}`).join(' | ') ?? 'none'}
BATTLE PLAN: ${ai?.actionableBattlePlan?.map((s: any) => s.title).join(' → ') ?? 'pending'}
SEO TARGETS: ${ai?.seoKeywordsToTarget?.join(', ') ?? ''}
    `.trim()
  }

  return `
PRODUCT: ${raw?.title ?? analysis.targetName}
ASIN: ${raw?.asin ?? ''}
BRAND: ${raw?.brand ?? ''}
PRICE: ${raw?.currency ?? 'USD'} ${raw?.price ?? '?'}
RATING: ${raw?.rating ?? '?'}/5 (${raw?.reviewCount?.toLocaleString() ?? '?'} reviews)

AI ANALYSIS SUMMARY: ${ai?.summary ?? ''}
COMPETITOR SCORE: ${ai?.competitorScore ?? '?'}/100
TOP FLAWS: ${ai?.vulnerabilities?.filter((v: any) => v.severity === 'HIGH').map((v: any) => v.finding).join(' | ') ?? 'none'}
BATTLE PLAN: ${ai?.actionableBattlePlan?.map((s: any) => s.title).join(' → ') ?? 'pending'}
SEO TARGETS: ${ai?.seoKeywordsToTarget?.join(', ') ?? ''}
  `.trim()
}
