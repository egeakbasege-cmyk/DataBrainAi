import { Router, Request, Response } from 'express'
import { retrieveBenchmarks }       from '../lib/benchmark'
import { buildSystemPrompt, buildUserMessage } from '../lib/prompts'
import { streamToResponse }         from '../lib/anthropic'
import type { ChatPayload, Message } from '../types'

export const chatRouter = Router()

chatRouter.post('/chat', async (req: Request, res: Response) => {
  const userEmail = req.headers['x-user-email'] as string | undefined
  if (!userEmail) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  const payload = req.body as Partial<ChatPayload>

  const message       = (payload.message ?? '').trim()
  const context       = payload.context
  const fileContent   = payload.fileContent
  const imageBase64   = payload.imageBase64
  const imageMimeType = payload.imageMimeType
  const mode          = payload.mode      ?? 'upwind'
  const agentMode     = payload.agentMode ?? 'auto'
  const history       = payload.messages  ?? []

  if (!message && !imageBase64) {
    res.status(400).json({ error: 'Message is required.' })
    return
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    // ── 1. Benchmark retrieval ──────────────────────────────────────────────
    const benchmarks = await retrieveBenchmarks(message)

    // ── 2. Build system prompt ──────────────────────────────────────────────
    const system = buildSystemPrompt(mode, agentMode, benchmarks)

    // ── 3. Build message thread ─────────────────────────────────────────────
    const userContent = buildUserMessage(message, context, fileContent, mode)

    const messages: Message[] = [
      // Downwind: include prior conversation turns for multi-turn memory
      ...history,
      { role: 'user', content: userContent },
    ]

    // ── 4. Stream Claude response ───────────────────────────────────────────
    await streamToResponse({ system, messages, res, imageBase64, mimeType: imageMimeType })

    res.end()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[chat] stream error:', msg)

    // If headers already sent, write a JSON error token into the stream
    if (res.headersSent) {
      res.write(JSON.stringify({ error: 'Analysis failed. Please try again.' }))
      res.end()
    } else {
      res.status(500).json({ error: 'Analysis failed. Please try again.' })
    }
  }
})
