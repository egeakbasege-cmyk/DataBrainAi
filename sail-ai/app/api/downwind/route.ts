import { NextRequest, NextResponse }  from 'next/server'
import { auth }                        from '@/auth'
import Groq                            from 'groq-sdk'
import { DOWNWIND_SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'
import { handleApiError, ApiError }    from '@/utils/api-error'
import type { ConvMessage }            from '@/hooks/useSailState'

const MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
]

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to use Sail AI.')
    }

    const body = await req.json().catch(() => {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
    })

    const {
      message,
      context,
      fileContent,
      messages = [],
      apiKey,
      language = 'en',
    } = body as {
      message:      string
      context?:     string
      fileContent?: string
      messages?:    ConvMessage[]
      apiKey?:      string
      language?:    string
    }

    if (!message?.trim()) {
      throw new ApiError(422, 'MISSING_MESSAGE', 'Message is required.')
    }

    // Inject language directive so the captain responds in the user's language
    const langNote = language !== 'en'
      ? `[LANGUAGE: Respond in the user's language — locale: ${language}. All chatMessage and followUpQuestion fields must be in that language.]\n\n`
      : ''

    const userMessage = langNote + buildUserMessage(message.trim(), context, fileContent, 'downwind')

    // Build conversation history from prior turns
    const history: { role: 'user' | 'assistant'; content: string }[] = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const groq = new Groq({ apiKey: apiKey ?? process.env.GROQ_API_KEY })
    let lastErr: unknown = null

    for (const modelName of MODEL_CHAIN) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: DOWNWIND_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: userMessage },
          ],
          model: modelName,
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        })

        const text = chatCompletion.choices[0]?.message?.content || ''

        return new NextResponse(text, {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (err: any) {
        const raw: string = err?.message ?? ''
        if (raw.includes('API_KEY') || raw.includes('auth')) {
          throw new ApiError(
            502,
            'AI_KEY_INVALID',
            apiKey
              ? 'Your API key is invalid or lacks access. Please check it in Settings.'
              : 'AI service configuration error.',
          )
        }
        lastErr = err
      }
    }

    const raw = (lastErr as any)?.message ?? ''
    const isQuota = raw.includes('429') || raw.includes('quota') || raw.includes('rate')
    throw new ApiError(
      503,
      isQuota ? 'AI_QUOTA_EXHAUSTED' : 'AI_UNAVAILABLE',
      isQuota
        ? 'AI quota exhausted. Add your own Groq key in Settings.'
        : 'AI models are temporarily unavailable. Please try again shortly.',
    )
  } catch (error) {
    return handleApiError(error)
  }
}
