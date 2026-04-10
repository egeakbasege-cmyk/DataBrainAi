import { NextRequest, NextResponse }   from 'next/server'
import { auth }                        from '@/auth'
import { GoogleGenerativeAI }          from '@google/generative-ai'
import { AnalysisRequestSchema }       from '@/schema/analysis'
import { handleApiError, ApiError }    from '@/utils/api-error'
import { prisma }                      from '@/lib/prisma'
import { SYSTEM_PROMPT }               from '@/lib/ai-prompt'

const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

/** Build a rich, context-aware prompt from structured metrics. */
function buildAnalysisPrompt(req: {
  sector:    string
  metrics?:  Record<string, unknown>
  focusArea: string
  tone:      string
  context?:  string
}): string {
  const lines: string[] = []

  if (req.context) lines.push(`DIAGNOSTIC CONTEXT:\n${req.context}\n`)

  lines.push(`SECTOR: ${req.sector}`)
  lines.push(`FOCUS AREA: ${req.focusArea}`)
  lines.push(`PREFERRED TONE: ${req.tone}`)

  if (req.metrics && Object.keys(req.metrics).length > 0) {
    lines.push('\nBUSINESS METRICS:')
    for (const [k, v] of Object.entries(req.metrics)) {
      if (v !== undefined && v !== null) {
        const label = k.replace(/([A-Z])/g, ' $1').toLowerCase()
        lines.push(`  - ${label}: ${v}`)
      }
    }
  }

  return lines.join('\n')
}

/** Run the model chain until one responds, or exhaust all options. */
async function generateAnalysis(
  prompt:    string,
  userApiKey?: string,
): Promise<string> {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  let lastErr: unknown = null

  for (const modelName of MODEL_CHAIN) {
    try {
      const client = userApiKey ? new GoogleGenerativeAI(userApiKey) : genai
      const model  = client.getGenerativeModel({
        model:             modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          maxOutputTokens:  1400,
          temperature:      0.35,
          responseMimeType: 'application/json',
        },
      })

      const result = await model.generateContent(`BUSINESS CHALLENGE:\n${prompt}`)
      return result.response.text()

    } catch (err: any) {
      const raw: string = err?.message ?? ''
      if (raw.includes('API_KEY') || raw.includes('INVALID_ARGUMENT')) {
        throw new ApiError(
          502,
          'AI_KEY_INVALID',
          userApiKey
            ? 'Your API key is invalid or lacks access. Please check it in Settings.'
            : 'AI service configuration error. Please contact support.',
        )
      }
      lastErr = err
    }
  }

  const raw = (lastErr as any)?.message ?? ''
  const isQuota = raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')
  throw new ApiError(
    503,
    isQuota ? 'AI_QUOTA_EXHAUSTED' : 'AI_UNAVAILABLE',
    isQuota
      ? 'AI quota exhausted. Add your own Gemini key at aistudio.google.com.'
      : 'AI models are temporarily unavailable. Please try again shortly.',
  )
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check (middleware already blocks unauthenticated — this is a double-lock)
    const session = await auth()
    if (!session?.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'You must be signed in to run an analysis.')
    }

    // 2. Strict Zod validation
    const body          = await req.json().catch(() => { throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.') })
    const validated     = AnalysisRequestSchema.parse(body)
    const { sector, metrics, focusArea, tone, context } = validated

    // 3. Build prompt and call AI
    const prompt  = buildAnalysisPrompt({ sector, metrics: metrics as any, focusArea, tone, context })
    const rawJson = await generateAnalysis(prompt, body.apiKey)

    // 4. Parse AI output — it must be valid JSON
    let output: unknown
    try {
      output = JSON.parse(rawJson)
    } catch {
      throw new ApiError(502, 'AI_PARSE_ERROR', 'AI returned an unreadable response. Please try again.')
    }

    // 5. Check for embedded AI errors
    if (output !== null && typeof output === 'object' && 'error' in output) {
      throw new ApiError(502, 'AI_ERROR', (output as any).error)
    }

    // 6. Persist to database
    const record = await prisma.analysis.create({
      data: {
        userId:      session.user.id ?? null,
        isAnonymous: false,
        sector,
        metrics:     (metrics ?? {}) as any,
        output:      output as any,
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}
