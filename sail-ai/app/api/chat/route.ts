import { NextRequest }          from 'next/server'
import { auth }                 from '@/auth'
import Groq                     from 'groq-sdk'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'
import { ChatRequestSchema }    from '@/schema/analysis'

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Model fallback chain — tries each in order until one succeeds
const MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768',
  'llama3-70b-8192',
]

function getClient(apiKey?: string) {
  return apiKey ? new Groq({ apiKey }) : groqClient
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
      const client = getClient(userApiKey)

      for (const modelName of MODEL_CHAIN) {
        try {
          const completion = await client.chat.completions.create({
            model:       modelName,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user',   content: buildUserMessage(message, context) },
            ],
            max_tokens:  1400,
            temperature: 0.35,
            stream:      true,
          })

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }

          controller.close()
          return

        } catch (err: any) {
          const msg: string = err?.message ?? ''
          const isAuthError = msg.includes('API key') || msg.includes('auth') || msg.includes('401') || msg.includes('invalid_api_key')
          if (isAuthError) {
            controller.enqueue(encoder.encode(JSON.stringify({
              error: userApiKey
                ? 'Your API key is invalid. Please check it and try again.'
                : 'AI service configuration error. Please contact support.',
            })))
            controller.close()
            return
          }
          // Try next model
          continue
        }
      }

      // All models exhausted
      controller.enqueue(encoder.encode(JSON.stringify({
        error: 'AI service temporarily unavailable. Please try again in a moment.',
      })))
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
