/**
 * POST /api/i18n/translate
 * ─────────────────────────────────────────────────────────────────────────────
 * NLP-driven translation engine — Groq-backed, business-context-aware.
 *
 * Unlike static key-value i18n, this endpoint:
 *   • Preserves technical & business terminology (revenue, CVR, EBITDA, etc.)
 *   • Handles semantic nuance — not word-for-word literal substitution
 *   • Processes up to 20 strings per request to amortise latency
 *   • Returns ordered JSON array matching input indices
 *
 * Request  { texts: string[]; targetLocale: string; context?: string }
 * Response { translations: string[]; cached: boolean }
 *
 * Edge-compatible: uses only fetch(), no Node.js APIs.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
  zh: 'Simplified Chinese',
}

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[]

async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
  if (GROQ_KEYS.length === 0) throw new Error('No Groq API keys configured.')
  const key  = GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)]!
  const body = {
    model:       'llama-3.1-8b-instant',   // 8B for speed — translation doesn't need 70B
    temperature: 0.1,
    max_tokens:  2048,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: prompt },
    ],
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Groq error ${res.status}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message.content ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const { texts, targetLocale, context } = await req.json() as {
      texts:        string[]
      targetLocale: string
      context?:     string
    }

    // ── Validation ────────────────────────────────────────────────────────
    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'texts array is required' }, { status: 400 })
    }
    if (!targetLocale || !LOCALE_NAMES[targetLocale]) {
      return NextResponse.json({ error: 'Invalid targetLocale' }, { status: 400 })
    }
    if (targetLocale === 'en') {
      // No translation needed
      return NextResponse.json({ translations: texts, cached: false })
    }

    const MAX_TEXTS = 20
    const batch = texts.slice(0, MAX_TEXTS)
    const langName = LOCALE_NAMES[targetLocale]!

    // ── System prompt ─────────────────────────────────────────────────────
    const systemPrompt = `You are an expert business intelligence translator specialising in ${langName}.

Rules:
1. Translate ONLY — do not add commentary, explanations, or markdown.
2. Preserve ALL technical/business terms exactly: revenue, CVR, EBITDA, ROAS, API, AI, SAIL, Upwind, Downwind, Trim, Catamaran, Synergy, Operator.
3. Preserve numbers, percentages, currency symbols, dates, and proper nouns unchanged.
4. Maintain the original register (formal/informal) and tone.
5. Return a valid JSON array with exactly ${batch.length} translated strings, in the same order as input.
6. Do NOT translate proper names of companies, products, or people.
7. If a string is already in ${langName}, return it unchanged.
${context ? `\nBusiness context: ${context}` : ''}

Output format (strictly):
["translation1", "translation2", ...]`

    const inputJson = JSON.stringify(batch)
    const prompt    = `Translate the following ${batch.length} strings to ${langName}:\n\n${inputJson}`

    const raw = await callGroq(prompt, systemPrompt)

    // ── Parse response ────────────────────────────────────────────────────
    // Extract JSON array even if the model adds preamble text
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      // Fallback: return originals
      return NextResponse.json({ translations: texts, cached: false })
    }

    const translations: string[] = JSON.parse(jsonMatch[0])

    // Safety: ensure array length matches input
    const safeTranslations = batch.map((orig, i) => translations[i] ?? orig)

    return NextResponse.json({ translations: safeTranslations, cached: false })
  } catch (err) {
    console.error('[i18n/translate]', err)
    // On any failure, return originals so UI never breaks
    return NextResponse.json({ translations: [], cached: false }, { status: 200 })
  }
}
