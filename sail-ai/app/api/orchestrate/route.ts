/**
 * app/api/orchestrate/route.ts — Multi-Mission Orchestration Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts a user question, runs the three-phase mission orchestrator, and
 * streams the result via SSE:
 *
 *   event: plan         — mission plan emitted immediately after planning
 *   event: mission_done — fired per completed mission (real-time progress)
 *   event: synthesis    — token-by-token answer stream from 70B synthesiser
 *   event: done         — final metadata (models used, elapsed time)
 *   event: error        — any fatal error
 *
 * Request body:
 *   { message, context?, fileContent?, language?, apiKey?, messages? }
 *
 * Auth: NextAuth session required (same as /api/chat).
 * Runtime: Vercel Edge (pure Web APIs, no Node.js).
 */

import { type NextRequest } from 'next/server'
import NextAuth             from 'next-auth'
import { authConfig }       from '@/auth.config'
import {
  planMissions,
  executeMissions,
  streamSynthesis,
}                           from '@/lib/orchestration/missionOrchestrator'
import type { MissionResult } from '@/lib/orchestration/missionOrchestrator'
import { checkRateLimit }   from '@/lib/cache/rateLimiter'
import { buildKeyPool }     from '@/lib/clients/groq'
import { scrubPII }         from '@/lib/skills/piiScrubber'

const { auth }    = NextAuth(authConfig)
export const runtime = 'edge'

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  let body: {
    message?:     string
    context?:     string
    fileContent?: string
    language?:    string
    apiKey?:      string
    messages?:    Array<{ role: string; content: string }>
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawQuery = body.message?.trim() ?? ''
  if (!rawQuery) return Response.json({ error: 'Message required.' }, { status: 422 })
  if (rawQuery.length > 8_000) return Response.json({ error: 'Message too long.' }, { status: 413 })

  // ── Key availability ───────────────────────────────────────────────────────
  const byokKey = body.apiKey?.trim() || undefined
  if (buildKeyPool(byokKey).length === 0) {
    return Response.json({ error: 'AI provider not configured.' }, { status: 503 })
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const userId   = session.user.email
  const rlResult = await checkRateLimit(userId)
  if (!rlResult.allowed) {
    return Response.json({ error: 'Rate limit reached. Try again shortly.' }, { status: 429 })
  }

  // ── PII scrub ─────────────────────────────────────────────────────────────
  const query   = scrubPII(rawQuery).scrubbedText
  const context = body.context ? scrubPII(body.context.slice(0, 600)).scrubbedText : undefined
  const language = body.language ?? 'en'
  const hasData  = Boolean(body.fileContent?.trim())

  // ── Build SSE stream ───────────────────────────────────────────────────────
  const totalT0 = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      const enc  = new TextEncoder()
      const emit = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(sseEvent(event, data)))

      try {
        // ── PHASE 1: Plan ────────────────────────────────────────────────────
        const plan = await planMissions(query, context, hasData, byokKey)

        emit('plan', {
          complexity: plan.complexity,
          reasoning:  plan.reasoning,
          missions:   plan.missions.map(m => ({
            id:    m.id,
            type:  m.type,
            label: m.label,
          })),
        })

        // ── PHASE 2: Execute missions in parallel ────────────────────────────
        // Fan out but stream individual completion events as they arrive.
        // We can't use allSettled + individual events easily in Edge,
        // so we run the parallel batch then emit all done events at once.

        const results: MissionResult[] = await executeMissions(
          plan.missions,
          query,
          {
            userId,
            context,
            fileContent: body.fileContent,
            language,
            byokKey,
          },
        )

        // Emit one mission_done per result
        for (const r of results) {
          emit('mission_done', {
            missionId:  r.missionId,
            label:      r.label,
            type:       r.type,
            elapsedMs:  r.elapsedMs,
            confidence: r.confidence,
            hasContent: r.content.length > 0,
            error:      r.error ?? null,
          })
        }

        // ── PHASE 3: Stream synthesis ────────────────────────────────────────
        emit('synthesis_start', {})

        const synthRes = await streamSynthesis(query, results, context, byokKey)

        if (!synthRes.ok || !synthRes.body) {
          emit('error', { message: 'Synthesis unavailable.' })
          controller.close()
          return
        }

        // Stream tokens from Groq → SSE chunks
        const reader  = synthRes.body.getReader()
        const decoder = new TextDecoder()
        let   buffer  = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') continue

            try {
              const chunk = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>
              }
              const text = chunk.choices?.[0]?.delta?.content
              if (text) emit('chunk', { text })
            } catch { /* skip malformed */ }
          }
        }

        // ── Done ─────────────────────────────────────────────────────────────
        const modelsUsed = [
          'llama-3.1-8b-instant',   // planner + specialists
          results.some(r => r.type === 'SEARCH')  ? 'tavily'             : '',
          results.some(r => r.type === 'RECALL')  ? 'pinecone+cohere'    : '',
          results.some(r => r.type === 'ANALYZE') ? 'gemini-2.0-flash'   : '',
          'llama-3.3-70b-versatile', // reason + synthesis
        ].filter(Boolean)

        emit('done', {
          totalElapsedMs: Date.now() - totalT0,
          modelsUsed:     [...new Set(modelsUsed)],
          missionCount:   results.length,
          complexity:     plan.complexity,
        })

      } catch (err) {
        emit('error', {
          message: err instanceof Error ? err.message : 'Orchestration failed.',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
