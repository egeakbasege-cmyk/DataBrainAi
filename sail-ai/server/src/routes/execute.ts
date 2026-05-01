/**
 * POST /api/v1/execute
 *
 * Aetheris execution endpoint — the single upstream target for the
 * Next.js Edge proxy.  Every request passes through:
 *
 *   1. Bearer token authentication  (INTERNAL_API_KEY)
 *   2. AetherisPayload validation
 *   3. Shadow Context hydration     (pgvector similarity)
 *   4. Cognitive Load directive     (modulates LLM verbosity)
 *   5. Benchmark retrieval          (sector-relevant RAG)
 *   6. System prompt assembly       (agent mode + CLIndex + shadow + benchmarks)
 *   7. Anthropic call               (collect full response for schema enforcement)
 *   8. ExecutiveResponse validation (sanitise + fallback if needed)
 *   9. JSON response                (always returns valid ExecutiveResponse shape)
 */

import { Router, Request, Response } from 'express'
import { retrieveBenchmarks }         from '../lib/benchmark'
import { buildSystemPrompt, buildUserMessage } from '../lib/prompts'
import { buildAetherisSnapshot, serialiseShadowContext } from '../lib/shadowContext'
import {
  extractJsonFromLLMOutput,
  sanitiseExecutiveResponse,
  buildMockExecutiveResponse,
  validateExecutiveResponse,
} from '../lib/schemaValidator'
import { cognitiveLoadDirective } from '../types/architecture'
import type { AetherisPayload, AetherisState } from '../types/architecture'
import type { Message } from '../types'
import Anthropic from '@anthropic-ai/sdk'

export const executeRouter = Router()

// ── Lazy Anthropic client ─────────────────────────────────────────────────────
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}
const MODEL = () => process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-6'

// ── Bearer token auth middleware ──────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void): void {
  const expected = process.env.INTERNAL_API_KEY
  if (!expected) {
    // Key not configured — only allow in development
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Internal API key not configured.' })
      return
    }
    next()
    return
  }

  const auth   = req.headers['authorization'] ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (bearer !== expected) {
    res.status(401).json({ error: 'Unauthorised.' })
    return
  }
  next()
}

// ── Route ─────────────────────────────────────────────────────────────────────
executeRouter.post(
  '/execute',
  requireInternalKey,
  async (req: Request, res: Response) => {
    const userEmail = req.headers['x-user-email'] as string | undefined
    const language  = (req.headers['x-client-language'] as string | undefined) ?? 'en'
    const sessionId = (req.headers['x-aetheris-session'] as string | undefined) ?? 'init'

    if (!userEmail) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }

    // ── 1. Parse and validate AetherisPayload ──────────────────────────────
    const payload = req.body as Partial<AetherisPayload>

    const message       = (payload.message ?? '').trim()
    const imageBase64   = payload.imageBase64
    const imageMimeType = payload.imageMimeType
    const fileContent   = payload.fileContent
    const analysisMode  = payload.analysisMode  ?? 'upwind'
    const agentMode     = payload.agentMode     ?? 'Auto'
    const clientState   = payload.state         as Partial<AetherisState> | undefined
    // Synergy extras (passed through from the Next.js frontend)
    const synergyModes  = (req.body as Record<string, unknown>).synergyModes as string[] | undefined
    const synergyName   = (req.body as Record<string, unknown>).synergyName  as string  | undefined

    if (!message && !imageBase64) {
      res.status(422).json({ error: 'Message is required.' })
      return
    }

    // ── Streaming modes — pipe Anthropic stream directly ──────────────────
    const isStreaming = analysisMode === 'operator' || analysisMode === 'sail' || analysisMode === 'synergy'
    const isCustomJson = analysisMode === 'trim' || analysisMode === 'catamaran'

    try {
      // ── 2. Shadow Context hydration ──────────────────────────────────────
      const snapshot = await buildAetherisSnapshot(sessionId, userEmail, message)
      const cognitiveLoad = clientState?.cognitiveLoadIndex ?? snapshot.cognitiveLoadIndex ?? 0
      const clDirective   = cognitiveLoadDirective(cognitiveLoad)
      const shadowBlock   = serialiseShadowContext(snapshot.activeStrategicVectors ?? [])

      // ── 3. Benchmark retrieval ────────────────────────────────────────────
      const benchmarks = await retrieveBenchmarks(message)

      // ── 4. Build system prompt ────────────────────────────────────────────
      const apiAgentMode = agentMode.toLowerCase() as
        'auto' | 'strategy' | 'analysis' | 'execution' | 'review'

      const system = isStreaming || isCustomJson
        ? buildSystemPrompt(analysisMode, apiAgentMode, benchmarks, language)
        : clDirective + shadowBlock + EXECUTIVE_SCHEMA_INSTRUCTION + buildSystemPrompt(analysisMode, apiAgentMode, benchmarks, language)

      // ── 5. Build message thread ───────────────────────────────────────────
      const userContent = buildUserMessage(message, undefined, fileContent, analysisMode)
      type AnthropicMsg = Anthropic.Messages.MessageParam
      const messages: AnthropicMsg[] = imageBase64 && imageMimeType
        ? [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 } }, { type: 'text', text: userContent }] }]
        : [{ role: 'user', content: userContent }]

      // ── 6a. Streaming path (operator / sail / synergy) ────────────────────
      if (isStreaming) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('X-Accel-Buffering', 'no')

        // Mode-specific metadata header (first line before content)
        if (analysisMode === 'sail') {
          res.write(JSON.stringify({ __sailMeta: { intent: 'analytic' } }) + '\n')
        } else if (analysisMode === 'synergy') {
          const modes = synergyModes ?? ['upwind', 'sail']
          res.write(JSON.stringify({ __synMeta: { modes, companyName: synergyName ?? null } }) + '\n')
        }

        const stream = getAnthropic().messages.stream({
          model:      MODEL(),
          max_tokens: 2400,
          system,
          messages,
        })

        let sailIntentEmitted = analysisMode !== 'sail'
        let sailBuffer = ''

        stream.on('text', (text: string) => {
          if (!sailIntentEmitted) {
            sailBuffer += text
            const nl = sailBuffer.indexOf('\n')
            if (nl !== -1) {
              const firstLine = sailBuffer.slice(0, nl).trim()
              const match = firstLine.match(/\[INTENT:(analytic|coaching)\]/)
              if (match) {
                // Re-emit with correct intent
                res.write(JSON.stringify({ __sailMeta: { intent: match[1] } }) + '\n')
              }
              const rest = sailBuffer.slice(nl + 1)
              if (rest) res.write(rest)
              sailBuffer = ''
              sailIntentEmitted = true
            } else if (sailBuffer.length > 120) {
              res.write(sailBuffer)
              sailBuffer = ''
              sailIntentEmitted = true
            }
            return
          }
          res.write(text)
        })

        stream.on('error', (err: Error) => {
          console.error('[execute] stream error:', err.message)
          res.end()
        })

        stream.on('finalMessage', () => {
          if (sailBuffer) res.write(sailBuffer)
          res.end()
        })
        return
      }

      // ── 6b. Custom JSON path (trim / catamaran) ───────────────────────────
      if (isCustomJson) {
        const completion = await getAnthropic().messages.create({
          model:      MODEL(),
          max_tokens: 2048,
          system,
          messages,
        })
        const rawText = completion.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('')
        const parsed = extractJsonFromLLMOutput(rawText)
        if (parsed) {
          res.status(200).json(parsed)
        } else {
          // Fallback if JSON extraction fails
          if (analysisMode === 'trim') {
            res.status(200).json({ trimTitle: 'Strategic Plan', summary: rawText.slice(0, 300), phases: [] })
          } else {
            res.status(200).json({ catamaranTitle: 'System Overhaul', executiveSummary: rawText.slice(0, 300), marketGrowth: { actions: [], thirtyDayTarget: '' }, customerExperience: { actions: [], thirtyDayTarget: '' }, unifiedStrategy: '', thirtyDayTarget: '', greatestRisk: '', confidenceIndex: 70 })
          }
        }
        return
      }

      // ── 6c. Standard JSON path (upwind / downwind) ───────────────────────
      const completion = await getAnthropic().messages.create({
        model:      MODEL(),
        max_tokens: 2048,
        system,
        messages,
      })
      const rawText = completion.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
      const parsed   = extractJsonFromLLMOutput(rawText)
      const valid    = validateExecutiveResponse(parsed)
      const response = valid
        ? parsed
        : sanitiseExecutiveResponse(parsed ?? { insight: rawText.slice(0, 500) })
      res.status(200).json(response)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[execute] error:', msg)
      res.status(200).json(buildMockExecutiveResponse('Analysis service encountered an error. Please try again.'))
    }
  },
)

// ── Schema instruction appended to every system prompt ───────────────────────
// Placed BEFORE the main strategy prompt so it has highest priority with Claude.
const EXECUTIVE_SCHEMA_INSTRUCTION = `
RESPONSE CONTRACT — MANDATORY:
You MUST return ONLY valid JSON matching this exact schema. No prose, no markdown, no code fences.
Start your response with { and end with }.

{
  "insight": "<One to two sentences: the most important strategic finding for this query.>",
  "matrixOptions": [
    {
      "id": "<kebab-case-id>",
      "title": "<Action title, max 6 words>",
      "description": "<What to do and why, 1-2 sentences>",
      "sectorMedianSuccessRate": <0.0–1.0 float, sector benchmark success rate>,
      "implementationTimeDays": <integer, realistic calendar days>,
      "densityScore": <0–100 integer, information-to-complexity ratio>
    }
  ],
  "executionHorizons": {
    "thirtyDays": ["<Specific action with measurable outcome>"],
    "sixtyDays":  ["<Process or product milestone>"],
    "ninetyDays": ["<Strategic growth target with compounding effect>"]
  }
}

RULES:
- matrixOptions: provide 2–3 entries, ordered by sectorMedianSuccessRate DESC.
- executionHorizons: 1–3 items per horizon, specific and measurable.
- insight: reference the user's actual numbers if provided.
- Never output anything outside the JSON object.

`
