/**
 * lib/pipeline/humanizer.ts — Layer 4: NLP Humanizer
 * ────────────────────────────────────────────────────
 * Converts the validated structured JSON into executive-grade prose.
 *
 * Model: llama-3.1-8b-instant (fast, cheap — prose task, not analysis)
 * Latency: ~800ms typical
 *
 * Anti-fluff guarantee:
 *   - Banned phrases list (EN + TR) injected into system prompt
 *   - If LLM emits a banned phrase anyway → post-process strip
 *   - Output is clean narrative, no AI signposting, no hedge soup
 *
 * Language-aware: detects language from PipelineState and writes in kind.
 */

import type { ValidatedOutput, HumanizedResponse, ScopeMetadata, PipelineState } from './types'

const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions'
const HUMANIZER_MODEL = 'llama-3.1-8b-instant'  // fast model for prose task
const MAX_TOKENS      = 1800
const TEMPERATURE     = 0.45

// ── Language helper ───────────────────────────────────────────────────────────

function isTurkish(language: string): boolean {
  return language === 'tr' || language === 'turkish'
}

// ── Banned phrases (AI fluff filter) ─────────────────────────────────────────

const BANNED_PATTERNS: RegExp[] = [
  /\bAs an AI\b/gi,
  /\bI (cannot|can't|am unable to)\b/gi,
  /\bIt's (important|worth noting|crucial) to note\b/gi,
  /\bPlease note that\b/gi,
  /\bIn conclusion,?\s/gi,
  /\bTo summarize,?\s/gi,
  /\bIn summary,?\s/gi,
  /\bOverall,?\s/gi,
  /\bIt is (important|essential|critical) to\b/gi,
  /\bKeep in mind\b/gi,
  /\bAs mentioned (above|earlier|previously)\b/gi,
  /\bAs we (can see|discussed|mentioned)\b/gi,
  /\bIt goes without saying\b/gi,
  /\bAt the end of the day\b/gi,
  /\bMoving forward\b/gi,
  /\bGoing forward\b/gi,
  /\bLet me (explain|elaborate|clarify)\b/gi,
  // Turkish equivalents
  /\bSonuç olarak,?\s/gi,
  /\bÖzetle,?\s/gi,
  /\bGenel olarak,?\s/gi,
  /\bBelirtmek gerekir ki\b/gi,
  /\bDikkat etmek (önemli|gerekli)\b/gi,
  /\bİlerleyen süreçte\b/gi,
]

function stripFluff(prose: string): string {
  let out = prose
  for (const re of BANNED_PATTERNS) {
    out = out.replace(re, '')
  }
  return out.replace(/,\s+,/g, ',').replace(/\s{2,}/g, ' ').trim()
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildHumanizerSystemPrompt(language: string): string {
  const tr = isTurkish(language)
  const bannedList = tr
    ? `Şu ifadeleri KULLANMA: "Sonuç olarak", "Özetle", "Genel olarak", "Belirtmek gerekir ki", "yapay zeka olarak", "not etmek gerekir", "önemlidir", "dikkate alınmalı".`
    : `NEVER use: "In conclusion", "To summarize", "Overall", "It's important to note", "As an AI", "It is worth noting", "Please note", "Going forward", "Moving forward".`

  return [
    tr
      ? `Sen bir üst düzey iş stratejisti ve yönetim danışmanısın. Yapılandırılmış analiz verilerini C-suite yöneticilere hitap eden, akıcı ve etkileyici yönetici özeti haline dönüştürüyorsun.`
      : `You are a senior business strategist and management consultant. You convert structured analysis data into flowing, executive-grade narrative prose for C-suite consumption.`,
    ``,
    `RULES:`,
    `1. Write continuous narrative prose — NO bullet points, NO numbered lists, NO headers.`,
    `2. ${bannedList}`,
    `3. Never start a sentence with "I". Never mention AI, LLM, or the word "model".`,
    `4. Be direct, declarative, and confident. Hedge only when confidence data justifies it.`,
    `5. Integrate metrics naturally into sentences.`,
    `6. Language: ${tr ? 'Write in Turkish unless findings clearly reference English-language sources.' : 'Write in English.'}`,
    `7. Length: 3–5 tight paragraphs. No padding.`,
    `8. End with the single most important next action — one sentence, not a list.`,
  ].join('\n')
}

// ── User message builder ──────────────────────────────────────────────────────

function buildHumanizerUserMessage(data: ValidatedOutput, state: PipelineState): string {
  const lang = isTurkish(state.language as string) ? 'Turkish' : 'English'
  const lines: string[] = [
    `Convert the following structured analysis into ${lang} executive prose.`,
    `Mode: ${state.analysisMode} | Industry: ${state.intent.inferredIndustry} | Goal: ${state.intent.inferredGoal}`,
    `Revenue Tier: ${state.intent.revenueTier} | Time Horizon: ${state.intent.inferredTimeframe}`,
    `Confidence Score: ${data.confidenceScore}`,
    ``,
    `=== STRUCTURED ANALYSIS DATA ===`,
    ``,
    `EXECUTIVE SUMMARY:`,
    data.executiveSummary,
    ``,
    `KEY FINDINGS (${data.keyFindings.length}):`,
    data.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n'),
    ``,
    `RECOMMENDATIONS:`,
    data.recommendations.map((r, i) =>
      `${i + 1}. [${r.priority}] ${r.title} — ${r.rationale} (${r.timeframe}, effort: ${r.effort})`
    ).join('\n'),
    ``,
  ]

  if (data.metrics && data.metrics.length > 0) {
    lines.push(
      `METRICS:`,
      data.metrics.map(m => `• ${m.name}: ${m.value}${m.benchmark ? ` (benchmark: ${m.benchmark})` : ''} [${m.source}]`).join('\n'),
      ``,
    )
  }

  lines.push(
    `RISKS:`,
    data.risks.map((r, i) => `${i + 1}. [${r.severity}] ${r.title} → ${r.mitigation}`).join('\n'),
    ``,
    `NEXT ACTIONS:`,
    data.nextActions.join('; '),
    ``,
    `=== END OF STRUCTURED DATA ===`,
    ``,
    `Now write the executive narrative prose. No lists. No headers. Pure narrative.`,
  )

  return lines.join('\n')
}

// ── ScopeMetadata builder ─────────────────────────────────────────────────────

export function buildScopeMetadata(
  state:            PipelineState,
  data:             ValidatedOutput,
  processingMs:     number,
  validationPassed: boolean,
  liveDataUsed:     boolean,
): ScopeMetadata {
  return {
    domain:            state.intent.detectedDomain,
    segment:           state.intent.inferredAudience,
    optimizationGoal:  state.intent.inferredGoal,
    clarityScore:      state.intent.clarityScore,
    revenueTier:       state.intent.revenueTier,
    inferredIndustry:  state.intent.inferredIndustry,
    inferredTimeframe: state.intent.inferredTimeframe,
    injectedDefaults:  state.intent.injectedDefaults,
    analysisMode:      state.analysisMode,
    processingMs,
    validationPassed,
    repairIterations:  state.repairIterations,
    liveDataUsed,
    confidenceScore:   data.confidenceScore,
  }
}

// ── Groq fetch (non-streaming, key rotation) ──────────────────────────────────

async function humanizerGroqFetch(
  messages: Array<{ role: string; content: string }>,
  groqKeys: string[],
): Promise<string> {
  const body = JSON.stringify({
    model:       HUMANIZER_MODEL,
    messages,
    max_tokens:  MAX_TOKENS,
    temperature: TEMPERATURE,
    stream:      false,
  })

  for (const key of groqKeys) {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body,
    }).catch(() => null)

    if (!res) continue
    if (res.status === 429) continue

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Humanizer Groq error ${res.status}: ${text.slice(0, 200)}`)
    }

    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const prose = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (!prose) throw new Error('Humanizer returned empty content')
    return prose
  }

  throw new Error('All Groq keys exhausted in humanizer')
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function humanize(
  data:        ValidatedOutput,
  state:       PipelineState,
  groqKeys:    string[],
  liveDataUsed?: boolean,
): Promise<HumanizedResponse> {
  const rawProse = await humanizerGroqFetch(
    [
      { role: 'system', content: buildHumanizerSystemPrompt(state.language as string) },
      { role: 'user',   content: buildHumanizerUserMessage(data, state) },
    ],
    groqKeys,
  )

  const prose        = stripFluff(rawProse)
  const processingMs = Date.now() - state.startedAt

  const scopeMetadata = buildScopeMetadata(
    state,
    data,
    processingMs,
    state.repairIterations === 0 || !!state.validatedData,
    liveDataUsed ?? false,
  )

  return { prose, scopeMetadata }
}
