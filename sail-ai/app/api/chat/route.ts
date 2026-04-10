import { NextRequest }          from 'next/server'
import { auth }                 from '@/auth'
import { GoogleGenerativeAI }   from '@google/generative-ai'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'
import { ChatRequestSchema }    from '@/schema/analysis'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Model fallback chain — tries each in order until one succeeds
const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

function getModel(modelName: string, apiKey?: string) {
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : genai
  return client.getGenerativeModel({
    model:             modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens:  1400,
      temperature:      0.35,
      responseMimeType: 'application/json',
    },
  })
}

// Rate limiter keyed by user email — max 10 requests per minute
const rateMap = new Map<string, { count: number; reset: number }>()

function checkRate(identity: string): boolean {
  const now = Date.now()
  if (rateMap.size > 1000) {
    rateMap.forEach((v, k) => { if (now > v.reset) rateMap.delete(k) })
  }
  const entry = rateMap.get(identity)
  if (!entry || now > entry.reset) {
    rateMap.set(identity, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  // Auth.js v5 — auth() works in both App Router and Pages Router
  const session = await auth()
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Please sign in to use Sail AI.' }), {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const identity = session.user.email
  if (!checkRate(identity)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
      status:  429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Strict Zod validation — structured errors for the client
  let message: string
  let context: string | undefined
  let userApiKey: string | undefined

  try {
    const raw      = await req.json()
    const parsed   = ChatRequestSchema.parse({ ...raw, message: (raw.message ?? '').trim() })
    message        = parsed.message
    context        = parsed.context
    userApiKey     = parsed.apiKey
  } catch (err: any) {
    const isZod    = err?.name === 'ZodError'
    const details  = isZod ? err.flatten().fieldErrors : undefined
    return new Response(JSON.stringify({ error: isZod ? 'Invalid request.' : 'Invalid request body.', details }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastErr: any = null

      for (const modelName of MODEL_CHAIN) {
        try {
          const model  = getModel(modelName, userApiKey)
          const result = await model.generateContentStream(buildUserMessage(message, context))

          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }

          controller.close()
          return

        } catch (err: any) {
          const raw: string = err?.message ?? ''
          if (raw.includes('API_KEY') || raw.includes('API key') || raw.includes('INVALID_ARGUMENT')) {
            controller.enqueue(encoder.encode(JSON.stringify({
              error: userApiKey
                ? 'Your API key is invalid or has no access. Please check it and try again.'
                : 'Service configuration error. Please contact support.',
            })))
            controller.close()
            return
          }
          lastErr = err
          continue
        }
      }

      // All models exhausted
      const raw: string = lastErr?.message ?? ''
      const isQuota = raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')
      const msg = isQuota
        ? 'AI quota exhausted. Fix: go to aistudio.google.com → create a new API key → paste it in Settings below, or update GEMINI_API_KEY in Vercel.'
        : 'Unable to reach AI models. Please enter your own Gemini API key in Settings, or try again shortly.'

      controller.enqueue(encoder.encode(JSON.stringify({ error: msg })))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
