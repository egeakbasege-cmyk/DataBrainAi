/**
 * Aetheris Edge Proxy — with Groq fallback + SAIL adaptive mode
 *
 * Priority:
 *   1. SAIL mode  → Groq llama-3.3-70b streaming (intent-driven markdown)
 *   2. Railway    → Forward to Railway backend (RAILWAY_BACKEND_URL)
 *   3. Groq       → Fall back to Groq direct API (GROQ_API_KEY or body.apiKey)
 *
 * Upwind/Downwind: returns ExecutiveResponse JSON.
 * SAIL:            returns plain streaming markdown text.
 */

import { type NextRequest } from 'next/server'
import NextAuth                  from 'next-auth'
import { authConfig }            from '@/auth.config'
import type { AetherisPayload }  from '@/types/architecture'
import { cognitiveLoadDirective } from '@/types/architecture'
import { classifyIntent, buildSailSystemPrompt } from '@/lib/intent'

export const runtime = 'edge'

// Edge-compatible auth — uses the same config as middleware (no Prisma/Node.js APIs)
const { auth } = NextAuth(authConfig)

const UPSTREAM_URL  = process.env.RAILWAY_BACKEND_URL
const GROQ_URL      = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL    = 'llama-3.3-70b-versatile'

// ── SAIL mode: Groq streaming (intent-driven markdown) ────────────────────────

async function handleSailMode(body: AetherisPayload): Promise<Response> {
  const groqKey = process.env.GROQ_API_KEY ?? (body as AetherisPayload & { apiKey?: string }).apiKey
  if (!groqKey) {
    return Response.json(
      { error: 'AI provider not configured. Add a Groq API key in settings to continue.' },
      { status: 503 },
    )
  }

  const language     = body.language ?? 'en'
  const intentResult = classifyIntent(body.message)
  const systemText   = buildSailSystemPrompt(intentResult.intent, language)
  const userText     = [
    body.context?.trim() ? `CONTEXT\n${body.context.trim()}` : null,
    body.message.trim(),
    body.fileContent?.trim() ? `DATA\n${body.fileContent.slice(0, 8000)}` : null,
  ].filter(Boolean).join('\n\n')

  let groqRes: Response
  try {
    groqRes = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages: [
          { role: 'system', content: systemText },
          { role: 'user',   content: userText   },
        ],
        stream:      true,
        temperature: 0.72,
        max_tokens:  2048,
      }),
    })
  } catch {
    return Response.json({ error: 'Unable to reach Groq API.' }, { status: 502 })
  }

  if (!groqRes.ok) {
    const status = groqRes.status === 401 ? 401 : groqRes.status === 429 ? 429 : 502
    return Response.json(
      { error: status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : `Groq error: ${groqRes.status}` },
      { status },
    )
  }

  // Transform Groq SSE → plain text stream consumed by the client
  // Groq SSE: data: {"choices":[{"delta":{"content":"..."}}]}
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer  = writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // First chunk: intent metadata JSON line (parsed by client to set intent badge)
  const metaLine = JSON.stringify({ __sailMeta: { intent: intentResult.intent, confidence: intentResult.confidence } })
  writer.write(encoder.encode(metaLine + '\n')).catch(() => {})

  // Pipe Groq SSE body, extracting text deltas
  ;(async () => {
    try {
      const reader = groqRes.body!.getReader()
      let buffer   = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr || jsonStr === '[DONE]') continue
          try {
            const chunk = JSON.parse(jsonStr)
            const text  = chunk?.choices?.[0]?.delta?.content ?? ''
            if (text) await writer.write(encoder.encode(text))
          } catch { /* skip malformed chunk */ }
        }
      }
    } finally {
      writer.close().catch(() => {})
    }
  })()

  return new Response(readable, {
    status:  200,
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
      'X-Sail-Intent':     intentResult.intent,
    },
  })
}

// ── TRIM mode handler ─────────────────────────────────────────────────────────

async function handleTrimMode(body: AetherisPayload, session: any): Promise<Response> {
  const groqKey = process.env.GROQ_API_KEY ?? (body as any).apiKey
  if (!groqKey) {
    return Response.json(
      { error: 'AI provider not configured. Add a Groq API key in settings.' },
      { status: 503 },
    )
  }

  const language = body.language ?? 'en'
  
  const TRIM_SYSTEM_PROMPT = `You are Sail AI TRIM mode - a data-driven strategic advisor.

RESPONSE FORMAT - Valid JSON only:
{
  "chatMessage": "Main analysis text with insights",
  "metrics": {
    "metricKey": {
      "label": "Display Name",
      "value": "Current value",
      "benchmark": "Industry benchmark",
      "status": "good|warning|bad"
    }
  },
  "chart": {
    "data": [
      {"label": "Your Business", "value": 85, "color": "#3b82f6"},
      {"label": "Industry Avg", "value": 72, "color": "#94a3b8"}
    ]
  },
  "recommendation": "Specific actionable recommendation",
  "risk": "Key risk to consider"
}

GUIDELINES:
- Always include metrics with benchmarks when relevant
- Provide data-driven comparisons
- Give specific, measurable recommendations
- Cite industry standards`;

  const userMessage = [
    body.context?.trim() ? `CONTEXT: ${body.context.trim()}` : null,
    `QUERY: ${body.message.trim()}`,
    body.fileContent?.trim() ? `DATA: ${body.fileContent.slice(0, 5000)}` : null,
  ].filter(Boolean).join('\n\n')

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: TRIM_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })

    if (!groqRes.ok) {
      const status = groqRes.status === 401 ? 401 : groqRes.status === 429 ? 429 : 502
      return Response.json(
        { error: status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : 'AI error' },
        { status },
      )
    }

    const data = await groqRes.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    return new Response(content, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return Response.json({ error: 'Unable to reach AI provider.' }, { status: 502 })
  }
}

// ── Groq system prompt ────────────────────────────────────────────────────────

function buildSystemPrompt(cognitiveLoad = 0, language = 'en'): string {
  const verbosity = cognitiveLoadDirective(cognitiveLoad)
  const langNote  = language !== 'en'
    ? `LANGUAGE: Respond in the user's language (locale: ${language}).\n\n`
    : ''

  return `${verbosity}${langNote}You are Aetheris, an elite business strategy AI built by Sail AI. You provide data-referenced, benchmark-driven strategic analysis for independent business operators.

RESPONSE FORMAT: You MUST return a single valid JSON object with EXACTLY this schema (no extra keys, no markdown):
{
  "insight": "string — your executive insight (2–4 sentences, data-dense, cite sector benchmarks where known)",
  "matrixOptions": [
    {
      "id": "kebab-case-unique-id",
      "title": "Action title (≤8 words)",
      "description": "What to do and why — 1–2 sentences, specific and actionable",
      "sectorMedianSuccessRate": 0.0,
      "implementationTimeDays": 0,
      "densityScore": 0
    }
  ],
  "executionHorizons": {
    "thirtyDays": ["Sprint item 1", "Sprint item 2"],
    "sixtyDays":  ["Build item 1", "Build item 2"],
    "ninetyDays": ["Horizon item 1", "Horizon item 2"]
  }
}

RULES:
- Provide 2–3 matrixOptions ranked by impact.
- sectorMedianSuccessRate: 0.0–1.0 (sector benchmark probability of this action succeeding).
- implementationTimeDays: realistic integer (e.g. 14, 30, 90).
- densityScore: 0–100 (ratio of executable information density; 80+ = highly compressed/actionable).
- Each executionHorizon array: 2–4 concrete sprint items written as direct imperatives ("Do X", "Build Y").
- Return ONLY the JSON object — no explanation text outside the JSON.`
}

// ── User message builder ──────────────────────────────────────────────────────

function buildUserMessage(body: AetherisPayload): string {
  const parts: string[] = []

  if (body.context?.trim()) {
    parts.push(`BUSINESS CONTEXT\n${body.context.trim()}`)
  }

  parts.push(`QUERY\n${body.message.trim()}`)

  if (body.fileContent?.trim()) {
    parts.push(`ATTACHED DATA\n${body.fileContent.slice(0, 8000)}`)
  }

  if (body.imageBase64) {
    parts.push('[Image attached — analyse the visual data in the context of the query.]')
  }

  if (body.agentMode && body.agentMode !== 'Auto') {
    parts.push(`AGENT MODE: ${body.agentMode}`)
  }

  if (body.analysisMode === 'downwind') {
    parts.push('MODE: Conversational deep-dive — expand on trade-offs and second-order effects.')
  }

  return parts.join('\n\n')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Session guard — NextAuth v5 Edge-compatible check
  const session = await auth()

  if (!session?.user?.email) {
    return Response.json(
      { error: 'Authentication required. Please sign in.' },
      { status: 401 },
    )
  }

  // 2. Parse and validate payload
  let body: AetherisPayload
  try {
    body = (await req.json()) as AetherisPayload
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.message?.trim() && !body.imageBase64) {
    return Response.json({ error: 'Message is required.' }, { status: 422 })
  }

  // 3. SAIL auto-intent mode → Gemini streaming (bypasses Railway/Groq)
  if (body.analysisMode === 'sail') {
    return handleSailMode(body)
  }

  // 3.5 TRIM mode → Data-driven strategic analysis
  if (body.analysisMode === 'trim') {
    return handleTrimMode(body, session)
  }

  // 4. Railway backend (primary path for upwind/downwind)
  if (UPSTREAM_URL) {
    let upstream: Response
    try {
      upstream = await fetch(`${UPSTREAM_URL}/api/v1/execute`, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'Authorization':     `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
          'X-User-Email':       session.user.email,
          'X-Client-Language':  req.headers.get('X-Client-Language')  ?? body.language ?? 'en',
          'X-Aetheris-Session': req.headers.get('X-Aetheris-Session') ?? body.sessionId ?? 'init',
        },
        body: JSON.stringify(body),
      })
    } catch {
      return Response.json({ error: 'Proxy Forwarding Fault' }, { status: 502 })
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type':      upstream.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
        'Cache-Control':     'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // 5. Groq fallback (when Railway is not configured)
  const groqKey = process.env.GROQ_API_KEY ?? (body as AetherisPayload & { apiKey?: string }).apiKey

  if (!groqKey) {
    return Response.json(
      { error: 'AI provider not configured. Add a Groq API key in settings to continue.' },
      { status: 503 },
    )
  }

  const cognitiveLoad = (body.state as { cognitiveLoadIndex?: number } | undefined)?.cognitiveLoadIndex ?? 0
  const language      = body.language ?? 'en'

  let groqRes: Response
  try {
    groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           GROQ_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(cognitiveLoad, language) },
          { role: 'user',   content: buildUserMessage(body) },
        ],
        response_format: { type: 'json_object' },
        max_tokens:      2048,
        temperature:     0.4,
      }),
    })
  } catch {
    return Response.json({ error: 'Unable to reach AI provider.' }, { status: 502 })
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '')
    const status  = groqRes.status === 401 ? 401 : groqRes.status === 429 ? 429 : 502
    return Response.json(
      { error: status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : `AI provider error: ${groqRes.status}` },
      { status },
    )
  }

  // 5. Parse Groq response and extract JSON content
  let groqData: { choices?: Array<{ message?: { content?: string } }> }
  try {
    groqData = await groqRes.json()
  } catch {
    return Response.json({ error: 'AI provider returned invalid response.' }, { status: 502 })
  }

  const content = groqData?.choices?.[0]?.message?.content ?? ''

  // Try to parse the content as ExecutiveResponse JSON
  try {
    const parsed = JSON.parse(content)
    return Response.json(parsed, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    // LLM returned non-JSON despite json_object mode — return content as insight
    return Response.json(
      { insight: content || 'Analysis complete. Please review and try again.' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
