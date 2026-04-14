import { NextRequest }                              from 'next/server'
import { auth }                                    from '@/auth'
import Groq                                        from 'groq-sdk'
import { GoogleGenerativeAI }                      from '@google/generative-ai'
import { SYSTEM_PROMPT, DOWNWIND_SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'
import { ChatRequestSchema }                       from '@/schema/analysis'

const MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'gemma2-9b-it',
]

let _groqClient: Groq | null = null

function getClient(apiKey?: string) {
  if (apiKey) return new Groq({ apiKey })
  if (!_groqClient) _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groqClient
}

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

  let message:       string
  let context:       string | undefined
  let userApiKey:    string | undefined
  let imageBase64:   string | undefined
  let imageMimeType: string | undefined
  let fileContent:   string | undefined
  let mode:          'upwind' | 'downwind' | undefined
  let messages:      { role: 'user' | 'assistant'; content: string }[] | undefined

  try {
    const raw    = await req.json()
    const parsed = ChatRequestSchema.parse({ ...raw, message: (raw.message ?? '').trim() })
    message       = parsed.message
    context       = parsed.context
    userApiKey    = parsed.apiKey
    imageBase64   = parsed.imageBase64
    imageMimeType = parsed.imageMimeType
    fileContent   = parsed.fileContent
    mode          = parsed.mode
    messages      = parsed.messages
  } catch (err: unknown) {
    const isZod   = (err as { name?: string })?.name === 'ZodError'
    const details = isZod ? (err as { flatten: () => unknown }).flatten() : undefined
    return new Response(JSON.stringify({ error: isZod ? 'Invalid request.' : 'Invalid request body.', details }), { status: 400 })
  }

  const encoder = new TextEncoder()

  // ── IMAGE PATH → Gemini Vision ────────────────────────────────────────────
  if (imageBase64 && imageMimeType) {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const genai  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
          const model  = genai.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: SYSTEM_PROMPT })
          const result = await model.generateContentStream([
            { inlineData: { mimeType: imageMimeType as string, data: imageBase64 as string } },
            `Analyse this image as part of the business strategy.\n\nBUSINESS CHALLENGE:\n${message}`,
          ])
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch {
          controller.enqueue(encoder.encode(JSON.stringify({
            error: 'Image analysis failed. Please try again or describe the image in text.',
          })))
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ── TEXT PATH → Groq streaming ────────────────────────────────────────────
  const isDownwind   = mode === 'downwind'
  const systemPrompt = isDownwind ? DOWNWIND_SYSTEM_PROMPT : SYSTEM_PROMPT
  const userMessage  = buildUserMessage(message, context, fileContent, mode)

  // Build conversation array for Groq
  // Downwind: include prior exchanges so the AI has real memory of the thread
  type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string }
  const groqMessages: GroqMessage[] = [{ role: 'system', content: systemPrompt }]

  if (isDownwind && messages?.length) {
    for (const m of messages) {
      groqMessages.push({ role: m.role, content: m.content })
    }
  }

  groqMessages.push({ role: 'user', content: userMessage })

  const stream = new ReadableStream({
    async start(controller) {
      const client = getClient(userApiKey)

      for (const modelName of MODEL_CHAIN) {
        try {
          const completion = await client.chat.completions.create({
            model:       modelName,
            messages:    groqMessages,
            max_tokens:  1600,
            temperature: isDownwind ? 0.5 : 0.35,
            stream:      true,
          })

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }

          controller.close()
          return

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : ''
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
          continue
        }
      }

      controller.enqueue(encoder.encode(JSON.stringify({
        error: 'AI service temporarily unavailable. Please try again in a moment.',
      })))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  })
}
