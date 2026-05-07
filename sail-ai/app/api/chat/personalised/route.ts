/**
 * POST /api/chat/personalised
 *
 * Personalised AI Engine — Next.js Edge Route
 *
 * Two execution paths:
 *
 *   PATH A — STREAMING (default):
 *     Fuses 2–4 selected mods into a single persona, streams via Groq,
 *     then runs post-stream guardrails (language bleed + market hallucination)
 *     on the fully accumulated text.
 *
 *     Response: text/plain stream
 *       Line 1 : { __persMeta: { hybridName, mods, language, year } }
 *       Lines 2+: markdown content
 *       Final   : optional { __guardRailWarning: {...} } line if guards triggered
 *
 *   PATH B — MARKET DATA (marketDataQuery: true):
 *     Calls Groq in JSON mode, validates the result against MarketDataSchema (Zod).
 *     On first-pass failure, a correction prompt is injected and the call is retried
 *     once. This is the generateObject + schema-validation pattern from the spec.
 *
 *     Response: application/json — MarketData object or 422 validation error
 *
 * Request shape: PersonalisedRequestBody (lib/personalised/types.ts)
 */

import { type NextRequest }                             from 'next/server'
import NextAuth                                          from 'next-auth'
import { authConfig }                                    from '@/auth.config'
import type { PersonalisedRequestBody }                  from '@/lib/personalised/types'
import { resolveModsFromIds, ANALYSIS_MODE_TO_MOD_ID }  from '@/lib/personalised/mod-registry'
import { generatePersonalisedPrompt }                    from '@/lib/personalised/prompt-synthesiser'
import { runGuardrails, validateMarketData }             from '@/lib/personalised/guardrails'

export const runtime = 'edge'

const { auth } = NextAuth(authConfig)

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ── Utilities ─────────────────────────────────────────────────────────────────

function getGroqKey(req: NextRequest, body: PersonalisedRequestBody): string | null {
  return (
    process.env.GROQ_API_KEY ??
    process.env.GROQ_API_KEY_1 ??
    process.env.GROQ_API_KEY_2 ??
    process.env.GROQ_API_KEY_3 ??
    body.apiKey ??
    null
  )
}

/**
 * Accept both registry IDs ('RUZGARA_KARSI') and mode strings ('upwind').
 */
function resolveRequestMods(ids: string[]) {
  const registryIds = ids.map(id => ANALYSIS_MODE_TO_MOD_ID[id] ?? id)
  return resolveModsFromIds(registryIds)
}

function buildUserMessage(body: PersonalisedRequestBody): string {
  const parts = [`QUERY\n${body.message.trim()}`]
  if (body.fileContent?.trim()) parts.push(`ATTACHED DATA\n${body.fileContent.slice(0, 8_000)}`)
  if (body.imageBase64)         parts.push('[Image attached — analyse as part of the response.]')
  return parts.join('\n\n')
}

// ── Market data system prompt (PATH B) ───────────────────────────────────────

function buildMarketDataSystemPrompt(hybridName: string, year: number): string {
  return `You are ${hybridName} in MARKET DATA EXTRACTION mode.
Output ONLY a single valid JSON object — no prose, no markdown, no code fences:

{
  "location": "full location name",
  "estimatedRentMin": <number — ANNUAL TRY, minimum 500000 for premium Turkish areas>,
  "estimatedRentMax": <number>,
  "currency": "TRY",
  "dataYear": ${year},
  "confidenceScore": <0.0–1.0>,
  "sourceConstraint": "how you derived this — cite inflation adjustment and multiplier",
  "marketMultiplier": <number ≥ 1 — post-2023 cumulative multiplier applied>,
  "anomalyFlags": ["any user-supplied figure that violated plausibility, or empty array"]
}

HARD RULES:
• dataYear MUST be ${year}. Historical data must be extrapolated forward.
• estimatedRentMin: for TRY in premium Turkish locations MUST be ≥ 500,000 (annual).
  Alaçatı ${year} floor: ₺1,500,000/year · Bodrum: ₺1,200,000 · Kaş: ₺900,000 · Çeşme: ₺1,000,000.
• If user-supplied rent is below the floor, set anomalyFlags and use market estimate.
• sourceConstraint MUST name the inflation/market multiplier applied.
• Return ONLY the JSON object. Zero text outside it.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH B — generateObject equivalent (Groq JSON mode + Zod validation)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeMarketDataGeneration(
  groqKey:      string,
  systemPrompt: string,
  userMessage:  string,
  attempt = 1,
): Promise<Response> {
  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:           GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      response_format: { type: 'json_object' },
      max_tokens:      600,
      temperature:     0.1,   // near-deterministic for structured data
    }),
  }).catch(() => null)

  if (!res?.ok) {
    return Response.json(
      { error: `Groq market-data request failed: ${res?.status ?? 'network error'}` },
      { status: res?.status === 429 ? 429 : 502 },
    )
  }

  const data: { choices?: Array<{ message?: { content?: string } }> } =
    await res.json().catch(() => ({}))
  const raw = data?.choices?.[0]?.message?.content ?? '{}'

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Market data response was not valid JSON.', raw }, { status: 422 })
  }

  const validation = validateMarketData(parsed)

  if (validation.success) {
    return Response.json(validation.data, {
      headers: { 'Cache-Control': 'no-store', 'X-Guardrail-Pass': 'true' },
    })
  }

  // ── One correction pass on first failure ──────────────────────────────────
  if (attempt === 1) {
    const fixes = validation.error.errors
      .map(e => `"${e.path.join('.')}" — ${e.message}`)
      .join('\n')
    const correctedSystem =
      systemPrompt +
      `\n\nCORRECTION REQUIRED — the following schema violations were detected:\n${fixes}\n` +
      `Fix these issues and re-emit the corrected JSON object only.`
    return executeMarketDataGeneration(groqKey, correctedSystem, userMessage, 2)
  }

  // Both attempts failed — return typed validation error
  return Response.json(
    {
      error:            'ERR_SCHEMA_VALIDATION',
      message:          'Market data failed MarketDataSchema validation after correction pass.',
      validationErrors: validation.error.errors,
      rawOutput:        parsed,
    },
    { status: 422, headers: { 'X-Guardrail-Pass': 'false' } },
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH A — Streaming personalised response
// ═══════════════════════════════════════════════════════════════════════════════

async function executePersonalisedStream(
  groqKey:      string,
  systemPrompt: string,
  userMessage:  string,
  metaHeader:   string,
  baseLanguage: 'tr-TR' | 'en-US',
  userQuery:    string,
): Promise<Response> {
  const streamRes = await fetch(GROQ_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      max_tokens:  2_400,
      temperature: 0.2,   // strict directive + language lock adherence
      stream:      true,
    }),
  }).catch(() => null)

  if (!streamRes?.ok) {
    return Response.json(
      { error: 'Personalised AI stream failed.' },
      { status: streamRes?.status === 429 ? 429 : 502 },
    )
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer  = writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  ;(async () => {
    // Emit metadata on line 1 — client uses this to render hybridName, mode chips
    await writer.write(encoder.encode(metaHeader + '\n'))

    const reader    = streamRes.body!.getReader()
    let   sseBuf    = ''
    let   fullText  = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      sseBuf += decoder.decode(value, { stream: true })
      const lines = sseBuf.split('\n')
      sseBuf = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue
        try {
          const chunk = JSON.parse(raw)
          const delta = (chunk.choices?.[0]?.delta?.content ?? '') as string
          if (!delta) continue
          fullText += delta
          await writer.write(encoder.encode(delta))
        } catch { /* ignore SSE framing errors */ }
      }
    }

    // ── Post-stream guardrail pass ────────────────────────────────────────
    const guard = runGuardrails(fullText, baseLanguage, userQuery)

    if (!guard.clean) {
      // Emit a guardrail metadata line (client can display a subtle warning badge)
      const warnMeta = JSON.stringify({
        __guardRailWarning: {
          languageError:     guard.languageError,
          marketCorrections: guard.marketCorrections,
          temporalWarnings:  guard.temporalWarnings,
        },
      })
      await writer.write(encoder.encode('\n' + warnMeta))

      // For language bleed: surface a visible in-response note
      if (guard.languageError) {
        await writer.write(
          encoder.encode(`\n\n---\n⚠️ **GUARDRAIL**: ${guard.languageError}\n`),
        )
      }
    }

    await writer.close()
  })()

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route handler
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Auth
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  // 2. Parse body
  let body: PersonalisedRequestBody
  try {
    body = (await req.json()) as PersonalisedRequestBody
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.message?.trim()) {
    return Response.json({ error: 'message is required.' }, { status: 422 })
  }
  if (!body.config?.selectedModIds?.length) {
    return Response.json({ error: 'config.selectedModIds is required.' }, { status: 422 })
  }

  const modIds = body.config.selectedModIds
  if (modIds.length < 2 || modIds.length > 4) {
    return Response.json(
      { error: `MOD_COUNT_INVALID: Got ${modIds.length}. Provide 2–4 mod IDs.` },
      { status: 422 },
    )
  }

  // 3. Resolve mods
  let resolvedMods
  try {
    resolvedMods = resolveRequestMods(modIds)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'MOD_RESOLUTION_ERROR' },
      { status: 422 },
    )
  }

  const baseLanguage = (body.config.baseLanguage ?? 'en-US') as 'tr-TR' | 'en-US'
  const hybridName   = body.config.hybridName ?? `${session.user.name ?? 'Your'} Personalised AI`
  const now          = new Date()

  // 4. API key
  const groqKey = getGroqKey(req, body)
  if (!groqKey) {
    return Response.json(
      { error: 'AI provider not configured. Add GROQ_API_KEY or pass apiKey in request.' },
      { status: 503 },
    )
  }

  const userMessage = buildUserMessage(body)

  // ── PATH B: Market Data (generateObject + Zod) ─────────────────────────────
  if (body.marketDataQuery) {
    const systemPrompt = buildMarketDataSystemPrompt(hybridName, now.getFullYear())
    return executeMarketDataGeneration(groqKey, systemPrompt, userMessage)
  }

  // ── PATH A: Streaming personalised response ────────────────────────────────
  let systemPrompt: string
  try {
    systemPrompt = generatePersonalisedPrompt({
      userId:          session.user.email,
      hybridName,
      selectedMods:    resolvedMods,
      baseLanguage,
      temporalContext: now,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'PROMPT_BUILD_ERROR' },
      { status: 500 },
    )
  }

  const metaHeader = JSON.stringify({
    __persMeta: {
      hybridName,
      mods:     resolvedMods.map(m => ({ id: m.id, name: m.name, weight: m.weight })),
      language: baseLanguage,
      year:     now.getFullYear(),
    },
  })

  return executePersonalisedStream(
    groqKey,
    systemPrompt,
    userMessage,
    metaHeader,
    baseLanguage,
    body.message,
  )
}
