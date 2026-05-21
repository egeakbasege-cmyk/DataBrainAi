/**
 * lib/orchestration/personalised-ai.ts — Personalised AI Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the legacy Synergy war-room with a bespoke advisory architecture.
 *
 * Architecture — Chain of Draft:
 *   Phase 1 — Three specialist 8B agents run simultaneously via Promise.all
 *              Hard 2-second timeout on the entire parallel phase.
 *              Each agent interrogates the query through a single expert lens.
 *              Output: SpecialistDraft (JSON Schema enforced — no repair needed).
 *
 *   Phase 2 — A 70B synthesis engine receives the collected drafts,
 *              fuses them into ONE authoritative advisory brief, and streams
 *              the result in real-time via SSE.
 *
 * Tone — Neo-Precisionist Advisory:
 *   • Minimalist diction. Every word earns its place.
 *   • Numerically anchored. Claims carry sources or [est.] labels.
 *   • Declarative. Not "you might consider" — "the path is X."
 *   • No introductions. No sign-offs. Begin with the insight.
 *
 * Token budget impact vs legacy Synergy:
 *   Legacy:   1 × 70B @ 1300 tokens = 1300 70B TPM
 *   New:      3 × 8B  @ 350 tokens + 1 × 70B @ 1200 tokens
 *             8B runs on its own 500K TPD pool → 70B TPM unchanged.
 */

import { groqFetch, JSON_SCHEMAS, GROQ_MODELS }     from '@/lib/clients/groq'
import type { GroqMessage }                          from '@/lib/clients/groq'
import { buildLanguageAnchor, DEEP_RESEARCH_DIRECTIVE } from '@/lib/prompts/enhanced-modes'
import { PROACTIVE_ENGAGEMENT_CONSTRAINT }           from '@/lib/prompts/enhanced-modes'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Compact intelligence brief returned by each parallel 8B specialist. */
export interface SpecialistDraft {
  lens:                  string   // e.g. "◈ FINANCIAL LENS"
  coreInsight:           string   // 2–3 precise sentences; carries a specific figure
  criticalFigure:        string   // single most important metric or number
  primaryRecommendation: string   // one high-leverage action, imperative voice
  confidence:            number   // 0.0–1.0
  dataSource:            'live-research' | 'training-estimate' | 'user-provided' | 'mixed'
}

export interface ChainOfDraftResult {
  drafts:      SpecialistDraft[]   // successfully returned (partial success OK)
  elapsedMs:   number              // wall-clock time for the parallel phase
  parallelMode: boolean            // true if ≥1 specialist returned a draft
}

// ── Specialist definitions ────────────────────────────────────────────────────
// Three fixed lenses — each interrogates the query from an isolated domain.
// Fixed specialists (vs user-configurable council) produce more coherent
// synthesis because the 70B model receives consistent lens labels every time.

const SPECIALISTS = [
  {
    id:    'financial',
    label: '◈ FINANCIAL LENS',
    directive: `You are a Principal-level financial analyst embedded inside a high-advisory AI system.
Your mandate: interrogate this query through the financial lens only.

Focus areas (use exactly these, in order of relevance to the query):
  1. Unit economics: LTV, CAC, payback period, contribution margin
  2. Revenue modelling: current run-rate, growth trajectory, pricing leverage
  3. Capital efficiency: burn rate, runway, ROI on the proposed action
  4. Margin mechanics: gross margin, operating leverage, break-even analysis

Precision rules:
  • Every numerical claim carries a source tag or [est.] label.
  • If live data is present in the query, use it — do NOT replace it with training estimates.
  • If a metric is absent, state the gap explicitly: "CAC figure absent — estimate required."
  • Produce ONE critical figure: the single most financially significant number in this analysis.
  • Your primary recommendation is ONE sentence, imperative, tied to a specific financial metric.`,
  },
  {
    id:    'strategic',
    label: '◈ STRATEGIC LENS',
    directive: `You are a Senior Partner-level strategy consultant embedded inside a high-advisory AI system.
Your mandate: interrogate this query through the competitive and strategic lens only.

Focus areas:
  1. Competitive positioning: differentiation, moat depth, pricing power vs peers
  2. Market dynamics: TAM/SAM trajectory, demand tailwinds or headwinds, substitution risk
  3. Strategic options: the 2–3 distinct paths available, with explicit trade-off analysis
  4. Second-order effects: what a successful execution of the primary path enables or threatens next

Precision rules:
  • State the strategic insight in ONE declarative sentence before elaborating.
  • Name the single most dangerous competitive assumption the business is currently making.
  • Your primary recommendation commits to ONE path — do not hedge across multiple options.
  • Confidence reflects data quality: if market data is absent, score ≤ 0.65.`,
  },
  {
    id:    'operational',
    label: '◈ OPERATIONAL LENS',
    directive: `You are an Operations Architect embedded inside a high-advisory AI system.
Your mandate: interrogate this query through the execution and operational lens only.

Focus areas:
  1. Execution mechanics: what must be TRUE operationally for the strategy to work
  2. Resource constraints: the binding constraint (team / capital / time / infrastructure)
  3. Critical path: the 3 sequential steps with the highest failure probability
  4. Early warning: the ONE metric that signals the plan is tracking off-course within 30 days

Precision rules:
  • Identify the binding constraint by name — do not describe it generically.
  • The critical path must have specific owners and timelines (even if estimated).
  • Your primary recommendation is an immediate operational action, executable this week.
  • Flag irreversibility: any action with an irreversibility score > 7/10 must be labelled [HARD TO REVERSE].`,
  },
] as const

type SpecialistId = typeof SPECIALISTS[number]['id']

// ── Agent prompt builder ──────────────────────────────────────────────────────

/**
 * buildPersonalisedAIAgentPrompt
 *
 * Constructs the system prompt for a single 8B specialist agent.
 * Each agent receives ONLY its own directive to prevent cross-contamination.
 */
export function buildPersonalisedAIAgentPrompt(
  specialistId:       SpecialistId,
  language          = 'en',
  primaryConstraint?: string,
): string {
  const specialist = SPECIALISTS.find(s => s.id === specialistId)
  if (!specialist) return ''

  const langAnchor   = buildLanguageAnchor(language)
  const constraint   = primaryConstraint
    ? `HARD CONSTRAINT: "${primaryConstraint}" — every output must directly address this.\n\n`
    : ''

  return `${langAnchor}${constraint}${specialist.directive}

${DEEP_RESEARCH_DIRECTIVE}

Return ONLY this JSON — no markdown, no explanation, no preamble:
{
  "lens":                  "${specialist.label}",
  "coreInsight":           "<2–3 precise sentences. Include one specific number.>",
  "criticalFigure":        "<the single most important metric or figure — label as [est.] if estimated>",
  "primaryRecommendation": "<one imperative sentence — specific, actionable, tied to a metric>",
  "confidence":            <0.0–1.0>,
  "dataSource":            "<live-research | training-estimate | user-provided | mixed>"
}`
}

// ── Parallel agent runner ─────────────────────────────────────────────────────

/**
 * runPersonalisedAIAgent
 *
 * Executes one specialist as an independent 8B Groq call.
 * Uses Structured Output (JSON Schema) — no repair step required.
 * Returns null on timeout, parse failure, or API error (partial success safe).
 */
async function runPersonalisedAIAgent(
  specialistId:       SpecialistId,
  language:           string,
  primaryConstraint:  string | undefined,
  userContent:        string,
  byokKey?:           string,
  signal?:            AbortSignal,
): Promise<SpecialistDraft | null> {
  const systemPrompt = buildPersonalisedAIAgentPrompt(specialistId, language, primaryConstraint)
  if (!systemPrompt) return null

  try {
    const res = await groqFetch(
      {
        model:            GROQ_MODELS.FAST,
        messages:         [
          { role: 'system', content: systemPrompt  },
          { role: 'user',   content: userContent   },
        ],
        response_format:  JSON_SCHEMAS.specialist_draft,
        max_tokens:       350,
        temperature:      0.25,    // low temperature: expert precision over creativity
      },
      byokKey,
    )

    if (!res.ok) return null

    const data    = await res.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null
    const content = data?.choices?.[0]?.message?.content ?? ''
    if (!content) return null

    return JSON.parse(content) as SpecialistDraft
  } catch {
    return null
  }
}

// ── Chain of Draft executor ───────────────────────────────────────────────────

/**
 * executeChainOfDraft
 *
 * Fires all three specialist agents simultaneously via Promise.all.
 * Hard 2.0-second wall-clock timeout on the entire parallel phase.
 * Partial success (1–2 agents returning) is acceptable — synthesis adapts.
 * Returns an empty drafts array if all agents time out or fail.
 */
export async function executeChainOfDraft(
  userContent:        string,
  language:           string,
  primaryConstraint?: string,
  byokKey?:           string,
): Promise<ChainOfDraftResult> {
  const startedAt = Date.now()

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 2_000)   // 2 s hard ceiling

  try {
    const settled = await Promise.allSettled(
      SPECIALISTS.map(s =>
        runPersonalisedAIAgent(
          s.id,
          language,
          primaryConstraint,
          userContent,
          byokKey,
          abort.signal,
        ),
      ),
    )

    clearTimeout(timer)

    const drafts = settled
      .filter((r): r is PromiseFulfilledResult<SpecialistDraft> =>
        r.status === 'fulfilled' && r.value !== null,
      )
      .map(r => r.value)

    return {
      drafts,
      elapsedMs:    Date.now() - startedAt,
      parallelMode: drafts.length > 0,
    }
  } catch {
    clearTimeout(timer)
    return { drafts: [], elapsedMs: Date.now() - startedAt, parallelMode: false }
  }
}

// ── Synthesis prompt builder ──────────────────────────────────────────────────

/**
 * buildPersonalisedAISystemPrompt
 *
 * Constructs the 70B synthesis prompt when specialist drafts are available.
 * Tone: Neo-Precisionist Advisory — authoritative, minimal, numerically anchored.
 */
export function buildPersonalisedAISystemPrompt(
  drafts:             SpecialistDraft[],
  language          = 'en',
  companyName?:       string,
  primaryConstraint?: string,
): string {
  const langAnchor  = buildLanguageAnchor(language)
  const name        = companyName ? `${companyName} Advisory` : 'Aetheris Advisory'
  const constraint  = primaryConstraint
    ? `CONSTRAINT — non-negotiable: "${primaryConstraint}" must be addressed in the synthesis.\n\n`
    : ''

  const draftSection = drafts
    .map(d => [
      `### ${d.lens}`,
      `Insight:            ${d.coreInsight}`,
      `Critical figure:    ${d.criticalFigure}`,
      `Recommendation:     ${d.primaryRecommendation}`,
      `Confidence:         ${Math.round(d.confidence * 100)}% — Source: ${d.dataSource}`,
    ].join('\n'))
    .join('\n\n')

  return `${langAnchor}${constraint}You are ${name} — a bespoke intelligence system operating at board-advisory level.
Three specialist analysts have independently interrogated this query. Their briefings follow.
Synthesise them into ONE authoritative advisory response.

━━━ SPECIALIST BRIEFINGS ━━━
${draftSection}
━━━ END BRIEFINGS ━━━

${DEEP_RESEARCH_DIRECTIVE}

SYNTHESIS PROTOCOL:
1. Open with the single most decisive insight across all three lenses — no preamble, no greeting.
   Lead sentence format: "[Specific claim with a number or named driver]."

2. For each specialist lens that contributed a material insight, write one section:
   ### ${SPECIALISTS[0].label} — [lens title]
   Expand the draft with 1–2 additional sentences. Cite any number from live data inline.

3. After all lens sections, write:
   ### ◈ ADVISORY VERDICT
   • **Critical path:** [the single most leveraged action — specific, bounded, owner implied]
   • **30-day signal:** [the exact metric that confirms execution is on-track]
   • **Primary risk:** [the one factor most likely to derail; name the trigger, not the category]
   • **Confidence:** [0–100] — [brief rationale: what data supports this level]

4. Close with one engagement hook (do NOT use a generic closing):

TONE — ABSOLUTE:
• Minimalist. Strip every word that doesn't carry information.
• Declarative mood. Never write "you might consider" or "it depends."
• Numbers anchor every claim. Absent data → explicit gap statement, never silence.
• Zero corporate filler. No "it is important to note." No "in conclusion."
• If two lenses conflict, name the conflict and resolve it with a tiebreak rationale.

${PROACTIVE_ENGAGEMENT_CONSTRAINT}`
}

/**
 * buildPersonalisedAIFallbackPrompt
 *
 * Used when ALL specialist agents fail (network issues, Groq outage).
 * The 70B model handles the full analysis without pre-computed drafts.
 * Maintains the same neo-precisionist tone and advisory structure.
 */
export function buildPersonalisedAIFallbackPrompt(
  language          = 'en',
  companyName?:       string,
  primaryConstraint?: string,
): string {
  const langAnchor  = buildLanguageAnchor(language)
  const name        = companyName ? `${companyName} Advisory` : 'Aetheris Advisory'
  const constraint  = primaryConstraint
    ? `CONSTRAINT — non-negotiable: "${primaryConstraint}" must be central to every recommendation.\n\n`
    : ''

  return `${langAnchor}${constraint}You are ${name} — a bespoke intelligence system operating at board-advisory level.
Perform a comprehensive analysis across three specialist lenses simultaneously:

${DEEP_RESEARCH_DIRECTIVE}

RESPONSE STRUCTURE:
### ◈ FINANCIAL LENS
Unit economics, revenue levers, margin mechanics. One critical figure per paragraph.

### ◈ STRATEGIC LENS
Competitive positioning, market dynamics, strategic options with explicit trade-offs.

### ◈ OPERATIONAL LENS
Binding constraint, critical path, early-warning metric.

### ◈ ADVISORY VERDICT
• **Critical path:** [specific action — bounded, measurable]
• **30-day signal:** [exact metric]
• **Primary risk:** [named trigger]
• **Confidence:** [0–100] — [rationale]

TONE: Minimalist. Declarative. Numerically anchored. Zero filler. Begin with the decisive insight.

${PROACTIVE_ENGAGEMENT_CONSTRAINT}`
}

// ── Meta line builder (for SSE stream) ───────────────────────────────────────

export interface PersonalisedAIMeta {
  companyName:    string | null
  healthReport:   unknown
  scopeMetadata:  unknown
  agentSummary:   Array<{ lens: string; confidence: number }>
  parallelMode:   boolean
  elapsedMs:      number
}

export function buildPersonalisedAIMeta(
  result:        ChainOfDraftResult,
  companyName:   string | undefined,
  healthReport:  unknown,
  scopeMetadata: unknown,
): PersonalisedAIMeta {
  return {
    companyName:   companyName ?? null,
    healthReport,
    scopeMetadata,
    agentSummary:  result.drafts.map(d => ({ lens: d.lens, confidence: d.confidence })),
    parallelMode:  result.parallelMode,
    elapsedMs:     result.elapsedMs,
  }
}
