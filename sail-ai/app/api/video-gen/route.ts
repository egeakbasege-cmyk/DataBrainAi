/**
 * app/api/video-gen/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI video generation endpoint — Luma Dream Machine primary, Runway Gen-3 fallback.
 *
 * POST /api/video-gen   { node: NarrativeNode }
 *   → { generationId: string }         (client begins polling)
 *
 * GET  /api/video-gen?id=xxx
 *   → { status: 'pending'|'complete'|'failed', url?: string }
 *
 * Provider selection:
 *   LUMA_API_KEY   set → uses Luma Dream Machine v1
 *   RUNWAY_API_KEY set → uses Runway Gen-3 Alpha (fallback)
 *   neither set    → returns { generationId: null } gracefully
 *                    (WebGL particle background remains active)
 *
 * Security:
 *   Auth required for POST (video gen is expensive).
 *   GET (polling) is open — generation IDs are opaque UUIDs.
 */

export const runtime = 'edge'

import { auth }   from '@/auth'
import { SCENES } from '@/components/landing/narrativeStore'
import type { NarrativeNode } from '@/components/landing/narrativeStore'

// ── Luma Dream Machine ────────────────────────────────────────────────────────

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1'

interface LumaGeneration {
  id:     string
  state:  'queued' | 'dreaming' | 'completed' | 'failed'
  assets?: { video?: string }
  failure_reason?: string
}

async function lumaCreate(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${LUMA_BASE}/generations`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      loop:         true,
      aspect_ratio: '16:9',
    }),
  })
  if (!res.ok) throw new Error(`Luma create ${res.status}`)
  const data = await res.json() as LumaGeneration
  return data.id
}

async function lumaStatus(id: string, apiKey: string): Promise<{ status: string; url?: string }> {
  const res = await fetch(`${LUMA_BASE}/generations/${id}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!res.ok) return { status: 'failed' }
  const data = await res.json() as LumaGeneration
  if (data.state === 'completed' && data.assets?.video) {
    return { status: 'complete', url: data.assets.video }
  }
  if (data.state === 'failed') return { status: 'failed' }
  return { status: 'pending' }
}

// ── Runway Gen-3 Alpha ────────────────────────────────────────────────────────

const RUNWAY_BASE = 'https://api.runwayml.com/v1'

interface RunwayTask {
  id:     string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  output?: string[]
}

async function runwayCreate(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${RUNWAY_BASE}/image_to_video`, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'Authorization':    `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      promptText:  prompt,
      model:       'gen3a_turbo',
      duration:    5,
      ratio:       '1280:768',
    }),
  })
  if (!res.ok) throw new Error(`Runway create ${res.status}`)
  const data = await res.json() as RunwayTask
  return `runway:${data.id}`
}

async function runwayStatus(id: string, apiKey: string): Promise<{ status: string; url?: string }> {
  const res = await fetch(`${RUNWAY_BASE}/tasks/${id}`, {
    headers: {
      'Authorization':    `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
    },
  })
  if (!res.ok) return { status: 'failed' }
  const data = await res.json() as RunwayTask
  if (data.status === 'SUCCEEDED' && data.output?.[0]) {
    return { status: 'complete', url: data.output[0] }
  }
  if (data.status === 'FAILED') return { status: 'failed' }
  return { status: 'pending' }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function detectProvider(): 'luma' | 'runway' | null {
  if (process.env.LUMA_API_KEY)   return 'luma'
  if (process.env.RUNWAY_API_KEY) return 'runway'
  return null
}

// ── POST — create generation ──────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  // Auth guard — video generation is billed per call
  const session = await auth()
  if (!session?.user) {
    // Allow anonymous for INTRO only (first screen, no cost if provider absent)
    const body = await req.json().catch(() => ({}) as { node?: NarrativeNode })
    if (body.node !== 'INTRO') {
      return jsonRes({ error: 'Sign in to enable cinematic backgrounds' }, 401)
    }
  }

  let body: { node?: NarrativeNode }
  try { body = await req.json() } catch { body = {} }

  const { node } = body
  if (!node || !SCENES[node]) {
    return jsonRes({ error: 'Invalid narrative node' }, 400)
  }

  const provider = detectProvider()
  if (!provider) {
    // No API key configured — WebGL fallback handles it gracefully
    return jsonRes({ generationId: null, message: 'Video generation not configured; WebGL background active' })
  }

  const prompt = SCENES[node].videoPrompt

  try {
    let generationId: string

    if (provider === 'luma') {
      generationId = await lumaCreate(prompt, process.env.LUMA_API_KEY!)
    } else {
      generationId = await runwayCreate(prompt, process.env.RUNWAY_API_KEY!)
    }

    return jsonRes({ generationId, provider })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return jsonRes({ error: 'Video generation failed', detail: msg }, 502)
  }
}

// ── GET — poll generation status ──────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return jsonRes({ error: 'id required' }, 400)

  const provider = detectProvider()
  if (!provider) return jsonRes({ status: 'failed', error: 'No provider configured' })

  try {
    let result: { status: string; url?: string }

    if (id.startsWith('runway:')) {
      const realId = id.replace('runway:', '')
      result = await runwayStatus(realId, process.env.RUNWAY_API_KEY!)
    } else {
      result = await lumaStatus(id, process.env.LUMA_API_KEY!)
    }

    return jsonRes(result)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return jsonRes({ status: 'failed', detail: msg }, 502)
  }
}
