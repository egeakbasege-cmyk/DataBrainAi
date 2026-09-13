import { NextRequest } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { buildProviderChain, isRetryableStatus, COHERE_MODELS, cohereStreamDelta } from '@/lib/clients/cohere'

export const runtime     = 'nodejs'
export const maxDuration = 60

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

    const chain = buildProviderChain()
    if (chain.length === 0) return new Response('No AI provider configured', { status: 500 })

    const record = await prisma.kairosAnalysis.findUnique({ where: { id: analysisId } })
    if (!record) return new Response('Analysis not found', { status: 404 })

    const ai  = record.aiAnalysis as any
    const raw = record.rawData    as any

    const systemPrompt = `You are KAIROS Copilot — an expert e-commerce intelligence analyst embedded inside Sail AI.
You have already analysed this competitor and have deep knowledge of their strengths, weaknesses, and market position.

## COMPETITOR INTEL
- Platform: ${record.platform}
- Target: ${record.targetName || record.targetUrl}
${ai?.summary ? `\n## EXECUTIVE SUMMARY\n${ai.summary}` : ''}
${ai?.vulnerabilities?.length > 0 ? `\n## VULNERABILITIES\n${ai.vulnerabilities.map((v: any) => `- [${v.severity}] ${v.category}: ${v.finding}`).join('\n')}` : ''}
${ai?.actionableBattlePlan?.length > 0 ? `\n## BATTLE PLAN\n${ai.actionableBattlePlan.map((s: any) => `${s.step}. ${s.title}: ${s.description}`).join('\n')}` : ''}
${raw?.priceRange ? `\n## PRICE RANGE\n$${raw.priceRange.min} – $${raw.priceRange.max} (avg $${raw.priceRange.avg})` : ''}
${ai?.seoKeywordsToTarget?.length > 0 ? `\n## SEO KEYWORDS\n${ai.seoKeywordsToTarget.join(', ')}` : ''}
${ai?.competitorScore !== undefined ? `\n## THREAT SCORE: ${ai.competitorScore}/100` : ''}

Answer directly, concisely, and tactically. Use bullet points for lists. Be specific and data-driven.`

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]
    if (history?.length) {
      for (const m of history.slice(-8)) {
        messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 800) })
      }
    }
    messages.push({ role: 'user', content: message })

    // Walk the provider cascade until one streams (Cohere 0→1→2→3 → Gateway → Groq)
    let lastStatus = 0
    for (const a of chain) {
      const res = await fetch(a.url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${a.key}` },
        body: JSON.stringify({
          model:       a.model(COHERE_MODELS.PRIMARY),
          temperature: 0.5,
          max_tokens:  1024,
          stream:      true,
          messages,
        }),
      }).catch(() => null)

      if (!res) { lastStatus = 502; continue }
      if (isRetryableStatus(res.status)) { lastStatus = res.status; continue }
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `AI error ${res.status}: ${err.slice(0, 200)}` }), { status: 500 })
      }

      // Stream SSE → plain text chunks to client
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          const reader  = res.body!.getReader()
          const decoder = new TextDecoder()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = decoder.decode(value, { stream: true })
              // Each chunk is one or more SSE lines: "data: {...}\n\n"
              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue
                const payload = line.slice(6).trim()
                if (payload === '[DONE]') break
                const token = cohereStreamDelta(payload)
                if (token) controller.enqueue(encoder.encode(token))
              }
            }
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
      })
    }

    return new Response(JSON.stringify({ error: `All Groq keys rate-limited (${lastStatus})` }), { status: 429 })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
