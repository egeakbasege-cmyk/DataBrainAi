import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Model fallback chain — tries each in order until one succeeds
const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

function getModel(modelName: string) {
  return genai.getGenerativeModel({
    model:             modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 1400,
      temperature:     0.35,
      responseMimeType: 'application/json',
    },
  })
}

// Simple in-memory rate limiter: max 10 requests per IP per minute
const rateMap = new Map<string, { count: number; reset: number }>()

function checkRate(ip: string): boolean {
  const now = Date.now()

  // Prune stale entries every 500 calls to prevent memory leak
  if (rateMap.size > 500) {
    rateMap.forEach((val, key) => {
      if (now > val.reset) rateMap.delete(key)
    })
  }

  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (!checkRate(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
      status:  429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let message: string
  let context: string | undefined
  try {
    const body = await req.json()
    message    = (body.message ?? '').trim()
    context    = typeof body.context === 'string' ? body.context : undefined
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400 })
  }

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required.' }), { status: 400 })
  }

  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Message too long (max 2000 characters).' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastErr: any = null

      for (const modelName of MODEL_CHAIN) {
        try {
          const model  = getModel(modelName)
          const result = await model.generateContentStream(buildUserMessage(message, context))

          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }

          controller.close()
          return  // success — exit the loop
        } catch (err: any) {
          const raw: string = err?.message ?? ''
          // Hard failures — no point retrying other models
          if (raw.includes('API_KEY') || raw.includes('API key')) {
            controller.enqueue(encoder.encode(JSON.stringify({
              error: 'Service configuration error. Please contact support.',
            })))
            controller.close()
            return
          }
          // Transient / model-specific — try next
          lastErr = err
          continue
        }
      }

      // All models exhausted
      const raw: string = lastErr?.message ?? ''
      const msg =
        raw.includes('429') || raw.includes('quota') || raw.includes('Too Many')
          ? 'Service is at capacity. Please create a new Gemini API key at aistudio.google.com and update your GEMINI_API_KEY in Vercel.'
          : 'Analysis failed. Please try again in a moment.'
      controller.enqueue(encoder.encode(JSON.stringify({ error: msg })))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    },
  })
}
