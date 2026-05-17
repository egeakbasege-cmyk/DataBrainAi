import { NextRequest } from 'next/server'
import Anthropic        from '@anthropic-ai/sdk'
import { prisma }       from '@/lib/prisma'

export const runtime     = 'nodejs'
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { analysisId, message, history } = await req.json() as {
      analysisId: string
      message:    string
      history?:   Array<{ role: string; content: string }>
    }

    if (!analysisId || !message) {
      return new Response('analysisId and message are required', { status: 400 })
    }

    const record = await prisma.kairosAnalysis.findUnique({ where: { id: analysisId } })
    if (!record) return new Response('Analysis not found', { status: 404 })

    const ai  = record.aiAnalysis  as any
    const raw = record.rawData     as any

    const systemPrompt = `You are KAIROS Copilot — an expert e-commerce intelligence analyst.
You have already analysed this competitor and have deep knowledge of their strengths, weaknesses, and market position.

## COMPETITOR INTEL
- Platform: ${record.platform}
- Target: ${record.targetName || record.targetUrl}
- Status: ${record.status}
${ai?.summary ? `\n## EXECUTIVE SUMMARY\n${ai.summary}` : ''}
${ai?.vulnerabilities?.length > 0 ? `\n## VULNERABILITIES\n${ai.vulnerabilities.map((v: any) => `- [${v.severity}] ${v.category}: ${v.finding}`).join('\n')}` : ''}
${ai?.actionableBattlePlan?.length > 0 ? `\n## BATTLE PLAN\n${ai.actionableBattlePlan.map((s: any) => `${s.step}. ${s.title}: ${s.description}`).join('\n')}` : ''}
${raw?.priceRange ? `\n## PRICE RANGE\n$${raw.priceRange.min} – $${raw.priceRange.max} (avg $${raw.priceRange.avg})` : ''}
${ai?.seoKeywordsToTarget?.length > 0 ? `\n## SEO KEYWORDS TO TARGET\n${ai.seoKeywordsToTarget.join(', ')}` : ''}
${ai?.competitorScore !== undefined ? `\n## COMPETITOR THREAT SCORE: ${ai.competitorScore}/100` : ''}

Answer the user's question directly and concisely. Be specific, tactical, and data-driven. Use bullet points when listing items.`

    const messages: Anthropic.MessageParam[] = []

    if (history?.length) {
      for (const m of history.slice(-8)) {
        messages.push({
          role:    m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.slice(0, 800),
        })
      }
    }
    messages.push({ role: 'user', content: message })

    const stream = client.messages.stream({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      system:     systemPrompt,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
