import { NextRequest, NextResponse }  from 'next/server'
import { auth }                        from '@/auth'
import { GoogleGenerativeAI }          from '@google/generative-ai'
import type { Content }                from '@google/generative-ai'
import { DOWNWIND_SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai-prompt'
import { handleApiError, ApiError }    from '@/utils/api-error'
import type { ConvMessage }            from '@/hooks/useSailState'

const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
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

    // Build Gemini conversation history from prior turns
    const history: Content[] = (messages as ConvMessage[]).map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const genai    = new GoogleGenerativeAI(apiKey ?? process.env.GEMINI_API_KEY!)
    let   lastErr: unknown = null

    for (const modelName of MODEL_CHAIN) {
      try {
        const model = genai.getGenerativeModel({
          model:             modelName,
          systemInstruction: DOWNWIND_SYSTEM_PROMPT,
          generationConfig:  {
            maxOutputTokens:  800,
            temperature:      0.4,
            responseMimeType: 'application/json',
          },
        })

        const chat   = model.startChat({ history })
        const result = await chat.sendMessage(userMessage)
        const text   = result.response.text()

        return new NextResponse(text, {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (err: any) {
        const raw: string = err?.message ?? ''
        if (raw.includes('API_KEY') || raw.includes('INVALID_ARGUMENT')) {
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

    const raw      = (lastErr as any)?.message ?? ''
    const isQuota  = raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')
    throw new ApiError(
      503,
      isQuota ? 'AI_QUOTA_EXHAUSTED' : 'AI_UNAVAILABLE',
      isQuota
        ? 'AI quota exhausted. Add your own Gemini key in Settings.'
        : 'AI models are temporarily unavailable. Please try again shortly.',
    )
  } catch (error) {
    return handleApiError(error)
  }
}
