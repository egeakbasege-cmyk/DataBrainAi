import { NextRequest } from 'next/server'
import { prisma }       from '@/lib/prisma'

export const runtime     = 'nodejs'
export const maxDuration = 60

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter(Boolean) as string[]
}

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

    const keys = getGroqKeys()
    if (keys.length === 0) return new Response('No GROQ_API_KEY configured', { status: 500 })

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

    // Try each key until one works (streaming)
    let lastStatus = 0
    for (const key of keys) {
      const res = await fetch(GROQ_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model:       GROQ_MODEL,
          temperature: 0.5,
          max_tokens:  1024,
          stream:      true,
          messages,
        }),
      })

      if (res.status === 429) { lastStatus = 429; continue }
      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `Groq error ${res.status}: ${err.slice(0, 200)}` }), { status: 500 })
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
                try {
                  const json  = JSON.parse(payload)
                  const token = json.choices?.[0]?.delta?.content
                  if (token) controller.enqueue(encoder.encode(token))
                } catch { /* skip malformed chunks */ }
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
