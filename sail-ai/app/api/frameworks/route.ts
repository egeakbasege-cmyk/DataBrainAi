/**
 * app/api/frameworks/route.ts — Strategic Framework Analysis
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/frameworks
 *
 * Given a business description and optional metrics, uses Groq 70B to
 * generate structured Ansoff Matrix and BCG Matrix placements with
 * rationale and recommended initiatives/actions.
 *
 * Returns JSON:
 *   { ansoff: AnsoffData, bcg: BcgData }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'

// ── Groq config ───────────────────────────────────────────────────────────────

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-70b-versatile'

function getGroqKey(): string {
  return (
    process.env.GROQ_API_KEY   ??
    process.env.GROQ_API_KEY_1 ??
    process.env.GROQ_API_KEY_2 ??
    process.env.GROQ_API_KEY_3 ??
    ''
  )
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strategic management consultant with expertise in the Ansoff Growth Matrix and BCG Growth-Share Matrix.

Given a business description, return ONLY a valid JSON object with this exact structure:

{
  "ansoff": {
    "quadrant": "<one of: market-penetration | market-development | product-development | diversification>",
    "confidence": <number 0.0-1.0>,
    "rationale": "<2-3 sentence explanation of why this quadrant applies>",
    "initiatives": ["<specific action 1>", "<specific action 2>", "<specific action 3>"],
    "riskLevel": "<one of: low | medium | high | very-high>"
  },
  "bcg": {
    "quadrant": "<one of: star | question-mark | cash-cow | dog>",
    "marketShare": <number 0-100, where 100 = dominant, 50 = parity with leader>,
    "growthRate": <number, market growth rate % e.g. 8.5 or -2.0>,
    "confidence": <number 0.0-1.0>,
    "rationale": "<2-3 sentence explanation>",
    "actions": ["<strategic action 1>", "<strategic action 2>", "<strategic action 3>"]
  }
}

Rules:
- Return ONLY the JSON object. No markdown. No explanations outside JSON.
- Base placements on the business context provided.
- marketShare should reflect the business's position relative to its largest competitor (100 = they are the largest).
- growthRate reflects the MARKET's overall growth rate, not the business's own growth.
- initiatives/actions must be specific and actionable, not generic advice.`

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  let body: {
    description: string
    sector?:     string
    metrics?:    { label: string; value: string }[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  if (!body.description || body.description.trim().length < 10) {
    return NextResponse.json({ error: 'Description too short.' }, { status: 400 })
  }

  const apiKey = getGroqKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 })
  }

  // Build user message
  const metricLines = body.metrics?.length
    ? '\n\nKey metrics:\n' + body.metrics.map(m => `- ${m.label}: ${m.value}`).join('\n')
    : ''
  const sectorLine = body.sector ? `\nSector: ${body.sector}` : ''

  const userMessage = `Business description: ${body.description.trim()}${sectorLine}${metricLines}`

  try {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.3,
        max_tokens:  800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Frameworks] Groq error:', err)
      return NextResponse.json({ error: 'AI service error.' }, { status: 502 })
    }

    const groqData = await res.json() as {
      choices?: { message?: { content?: string } }[]
    }

    const raw = groqData.choices?.[0]?.message?.content ?? ''

    // Extract JSON — strip any surrounding markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Frameworks] No JSON in response:', raw)
      return NextResponse.json({ error: 'Invalid AI response format.' }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      ansoff?: unknown
      bcg?:    unknown
    }

    if (!parsed.ansoff || !parsed.bcg) {
      return NextResponse.json({ error: 'Incomplete framework data.' }, { status: 502 })
    }

    return NextResponse.json({ ansoff: parsed.ansoff, bcg: parsed.bcg })

  } catch (err: unknown) {
    console.error('[Frameworks] Error:', err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
