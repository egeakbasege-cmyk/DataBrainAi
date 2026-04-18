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

// Sector benchmarks data
const SECTOR_BENCHMARKS: Record<string, Record<string, string>> = {
  'E-Commerce': {
    cvr: '2.3%',
    aov: '$85',
    cartAbandonment: '70.2%',
    returnRate: '20%',
    source: 'Baymard Institute, 2024',
  },
  'B2B SaaS': {
    monthlyChurn: '7-9%',
    cac: '$1,200',
    ltv: '$12,000',
    nrr: '110%',
    source: 'OpenView Partners, 2024',
  },
  'Professional Services': {
    utilization: '75%',
    referralRate: '18-22%',
    projectMargin: '35%',
    clientRetention: '85%',
    source: 'Agency Analytics, 2024',
  },
  'Fintech': {
    activationRate: '25%',
    fraudRate: '0.5%',
    cac: '$150',
    nps: '45',
    source: 'Fintech Benchmarks, 2024',
  },
  'Healthcare': {
    patientRetention: '80%',
    noShowRate: '15%',
    reimbursement: '92%',
    satisfaction: '4.2/5',
    source: 'Healthcare Metrics, 2024',
  },
}

function getSectorData(context?: string): string {
  if (!context) return ''
  
  // Try to detect sector from context
  const sector = Object.keys(SECTOR_BENCHMARKS).find(s => 
    context.toLowerCase().includes(s.toLowerCase())
  )
  
  if (!sector) return ''
  
  const data = SECTOR_BENCHMARKS[sector]
  return `

[SECTOR DATA FOR ${sector.toUpperCase()}]
${Object.entries(data).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Use this data to provide benchmarked insights and comparisons where relevant.`
}

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

    // Inject language directive
    const langNote = language !== 'en'
      ? `[LANGUAGE: Respond in the user's language — locale: ${language}. All chatMessage and followUpQuestion fields must be in that language.]\n\n`
      : ''

    // Get sector data for data-driven responses
    const sectorData = getSectorData(context)

    const userMessage = langNote + buildUserMessage(message.trim(), context, fileContent, 'downwind') + sectorData

    // Build conversation history
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
            { 
              role: 'system', 
              content: DOWNWIND_SYSTEM_PROMPT + `

[DATA-DRIVEN RESPONSE GUIDELINES]
- Always reference industry benchmarks when available
- Compare user metrics to sector medians where possible
- Provide specific, measurable recommendations
- Cite data sources when using benchmark information
- Format numbers clearly (percentages, currency, ratios)` 
            },
            ...history,
            { role: 'user', content: userMessage },
          ],
          model: modelName,
          temperature: 0.4,
          max_tokens: 1200,
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
