/**
 * Aetheris Edge Proxy — with Groq fallback
 *
 * Priority:
 *   1. Forward to Railway backend (RAILWAY_BACKEND_URL)
 *   2. Fall back to Groq direct API (GROQ_API_KEY or body.apiKey)
 *
 * Always returns ExecutiveResponse JSON.
 */

import { type NextRequest } from 'next/server'
import NextAuth                  from 'next-auth'
import { authConfig }            from '@/auth.config'
import type { AetherisPayload }  from '@/types/architecture'
import { cognitiveLoadDirective } from '@/types/architecture'

export const runtime = 'edge'

// Edge-compatible auth — uses the same config as middleware (no Prisma/Node.js APIs)
const { auth } = NextAuth(authConfig)

const UPSTREAM_URL = process.env.RAILWAY_BACKEND_URL
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.3-70b-versatile'

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

  // 3. Railway backend (primary path)
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

  // 4. Groq fallback (when Railway is not configured)
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
