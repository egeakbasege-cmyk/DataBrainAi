import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function getModel() {
  return genai.getGenerativeModel({
    model:             'gemini-1.5-flash',
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
  try {
    const body = await req.json()
    message    = (body.message ?? '').trim()
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
      try {
        const model  = getModel()
        const result = await model.generateContentStream(buildUserMessage(message))

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            // Send only the delta — client accumulates
            controller.enqueue(encoder.encode(text))
          }
        }

        controller.close()
      } catch (err: any) {
        const msg = err?.message?.includes('API_KEY') ? 'Service unavailable.' : (err.message || 'Generation failed.')
        controller.enqueue(encoder.encode(JSON.stringify({ error: msg })))
        controller.close()
      }
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
