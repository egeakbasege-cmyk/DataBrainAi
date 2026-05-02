/**
 * Personalised Prompt Synthesiser
 *
 * The architectural heart of the Personalised AI Engine.
 * Does NOT append mode prompts — weaves their behavioural essences into a
 * single unified AI persona via three phases:
 *
 *   1. CHARACTER FUSION    — merges personality traits into one voice
 *   2. DIRECTIVE LAYERING  — integrates behavioural rules weighted by selection order
 *   3. GUARDRAIL INJECTION — language lock + temporal anchor + data grounding
 *
 * Flagship combo: RÜZGARA KARŞI + SAIL
 *   The model leads with action (Upwind's strike velocity) then immediately
 *   deepens with context (SAIL's adaptive intelligence). Both in every response.
 */

import type { IAgentMod, IPersonalisedAIConfig } from './types'
import { buildLanguageAnchor, DEEP_RESEARCH_DIRECTIVE } from '@/lib/prompts/enhanced-modes'

// ── Language display names ────────────────────────────────────────────────────
const LANG_DISPLAY: Record<string, string> = {
  'tr-TR': 'Turkish (Türkçe)',
  'en-US': 'English',
}

// ── Domain → personality descriptor mapping ───────────────────────────────────
const DOMAIN_PERSONALITY: Record<string, string> = {
  strategy:               'long-horizon strategic thinker',
  growth:                 'growth-obsessed revenue architect',
  competitive:            'competitive intelligence analyst',
  operations:             'precision operations engineer',
  execution:              'sprint-velocity executor',
  coaching:               'Socratic discovery facilitator',
  discovery:              'root-cause excavator',
  diagnosis:              'diagnostic depth specialist',
  clarity:                'frame-breaking clarity engine',
  analytics:              'data-grounded benchmark synthesiser',
  benchmarking:           'sector-intelligence benchmarker',
  context:                'context-aware intelligence layer',
  depth:                  'multi-layer depth processor',
  planning:               'calculative timeline architect',
  timeline:               'phase-dependency sequencer',
  milestones:             'milestone accountability enforcer',
  'customer-experience':  'CX-retention systems designer',
  retention:              'churn-prevention specialist',
  systems:                'second-order systems thinker',
  synthesis:              'multi-domain intelligence synthesiser',
  risk:                   'failure-mode anticipator',
  adaptive:               'signal-adaptive intelligence engine',
  'multi-domain':         'cross-domain intelligence integrator',
  'deep-analysis':        'depth-first analytical engine',
  'decision-making':      'high-stakes decision architect',
  ROI:                    'ROI-precision calculator',
  phases:                 'phased execution engineer',
}

function deriveFusedPersonality(mods: IAgentMod[]): string {
  const allDomains = mods.flatMap(m => m.domainFocus)
  const domains    = allDomains.filter((v, i, a) => a.indexOf(v) === i)
  const traits  = domains
    .map(d => DOMAIN_PERSONALITY[d])
    .filter(Boolean)
    .slice(0, 6)
  if (traits.length === 0) return 'elite strategic advisor'
  if (traits.length <= 2)  return traits.join(' and ')
  const last = traits.pop()!
  return `${traits.join(', ')}, and ${last}`
}

// ── Per-combo integration rules ───────────────────────────────────────────────
function buildIntegrationRule(mods: IAgentMod[]): string {
  const ids = mods.map(m => m.id)
  const pct = (m: IAgentMod) => `${(m.weight * 100) | 0}%`

  // ── Flagship: Rüzgara Karşı + SAIL ───────────────────────────────────────
  if (ids.includes('RUZGARA_KARSI') && ids.includes('SAIL')) {
    const rk   = mods.find(m => m.id === 'RUZGARA_KARSI')!
    const sail = mods.find(m => m.id === 'SAIL')!
    return `INTEGRATION RULE — STRIKE + DEPTH SYNTHESIS:
Every response follows this two-phase architecture:

  PHASE 1 — THE STRIKE [${rk.name}, ${pct(rk)} weight]:
    Open with the single highest-leverage action. State it as an imperative.
    No preamble. The first sentence IS the recommendation.
    Anchor it to a named benchmark: metric + source + expected delta.

  PHASE 2 — THE DEPTH [${sail.name}, ${pct(sail)} weight]:
    Immediately after the strike, activate SAIL's adaptive signal detection.
    ANALYTIC signal → layer benchmark depth: Benchmark → Gap → Impact.
    COACHING signal → layer strategic depth: Reframe → Second-order → Fork.
    HYBRID signal   → 30% analytic anchor + 70% strategic depth.

THE INTEGRATION LAW:
Do NOT choose between action and depth — deliver both, every time.
The user experiences ONE unified voice: direct, data-anchored, and contextually deep.`
  }

  // ── Rüzgara Karşı + TRIM ─────────────────────────────────────────────────
  if (ids.includes('RUZGARA_KARSI') && ids.includes('TRIM')) {
    const rk   = mods.find(m => m.id === 'RUZGARA_KARSI')!
    const trim = mods.find(m => m.id === 'TRIM')!
    return `INTEGRATION RULE — STRIKE + TIMELINE PRECISION:
  PHASE 1 [${rk.name}, ${pct(rk)}]: Immediate action + benchmark anchor.
  PHASE 2 [${trim.name}, ${pct(trim)}]: Engineer the action into 20%-buffered phases with cost-of-delay per phase.
Signature: every response has an immediate directive AND a sequenced implementation plan.`
  }

  // ── SAIL + OPERATOR ───────────────────────────────────────────────────────
  if (ids.includes('SAIL') && ids.includes('OPERATOR')) {
    return `INTEGRATION RULE — ADAPTIVE DEPTH + UNIVERSAL INTELLIGENCE:
  SAIL detects the query signal. If analytic → OPERATOR's diagnostic/systems layers activate.
  If coaching → OPERATOR's strategic synthesis guides the coaching arc.
  Mandatory: 2+ benchmarks, 1 counter-intuitive insight, 1 £/$ figure per response.`
  }

  // ── Any combo involving CATAMARAN ─────────────────────────────────────────
  if (ids.includes('CATAMARAN')) {
    return `INTEGRATION RULE — DUAL-HULL SYNTHESIS:
  Every recommendation must show measurable impact on BOTH:
    Hull A (Market Growth): acquisition, revenue, expansion.
    Hull B (Customer Experience): retention, satisfaction, LTV.
  Other selected mod directives apply WITHIN each hull, not in competition with it.
  Cross-hull ripple is mandatory: "Action X impacts Hull A by __ AND Hull B by __".`
  }

  // ── Generic weighted synthesis for all other combos ───────────────────────
  const primary    = mods[0]
  const secondaries = mods.slice(1)
  return `INTEGRATION RULE — WEIGHTED SYNTHESIS:
  ${primary.name} [${pct(primary)} dominant]: sets the tone and opening move.
${secondaries.map(m => `  ${m.name} [${pct(m)}]: deepens, validates, or challenges without contradicting.`).join('\n')}
Output feels like ONE unified intelligence — not a round-table debate.`
}

// ── Directive blocks (weighted + labelled) ────────────────────────────────────
function buildDirectiveBlock(mod: IAgentMod): string {
  return `[${mod.name.toUpperCase()} — ${(mod.weight * 100) | 0}% WEIGHT]:\n${mod.systemDirective}`
}

// ── Market data guard injection ───────────────────────────────────────────────
const PREMIUM_LOCATIONS_SAMPLE = 'Alaçatı, Bodrum, Kaş, Çeşme, Bebek, Nişantaşı, Fethiye, Göcek'

function buildMarketGuard(year: number): string {
  return `MARKET DATA GUARDRAIL (Active — ${year}):
When the query involves real estate, rent, or local market data:
  → Apply the 2026 premium-area multiplier before stating any figure.
  → Known premium Turkish locations: ${PREMIUM_LOCATIONS_SAMPLE}.
  → ANNUAL RENT FLOOR (TRY): Alaçatı ₺1,500,000 · Bodrum ₺1,200,000 · Kaş ₺900,000 · Çeşme ₺1,000,000.
  → If user-supplied figure is BELOW floor, output:
      "[DATA ANOMALY] Claimed ₺X is below ${year} market floor for [location].
       Current estimate: ₺Y–₺Z/year ([source] + [multiplier]× inflation adjustment.)"
  → NEVER silently accept implausible numbers. Flag and correct.`
}

// ── Master prompt generator ───────────────────────────────────────────────────

/**
 * Generates a fused, single-persona system prompt from 2–4 IAgentMod objects.
 *
 * Per architecture spec (generatePersonalisedPrompt equivalent):
 *   - Does NOT concatenate raw mode prompts
 *   - Weaves directives into a unified CHARACTER, not a ruleset list
 *   - Language lock and temporal anchor are non-negotiable top-level constraints
 */
export function generatePersonalisedPrompt(config: IPersonalisedAIConfig): string {
  const { selectedMods, hybridName, baseLanguage, temporalContext } = config

  if (selectedMods.length < 2 || selectedMods.length > 4) {
    throw new Error(`PROMPT_BUILD_ERROR: ${selectedMods.length} mods supplied. Expected 2–4.`)
  }

  const year             = temporalContext.getFullYear()
  const modNames         = selectedMods.map(m => m.name).join(' + ')
  const langDisplay      = LANG_DISPLAY[baseLanguage] ?? baseLanguage
  const fusedPersonality = deriveFusedPersonality(selectedMods)
  const integrationRule  = buildIntegrationRule(selectedMods)
  const directives       = selectedMods.map(buildDirectiveBlock).join('\n\n')
  const marketGuard      = buildMarketGuard(year)

  // Language anchor — absolute top-priority preamble for non-English locales
  const langAnchor = buildLanguageAnchor(baseLanguage.split('-')[0].toLowerCase())

  return `${langAnchor}${DEEP_RESEARCH_DIRECTIVE}
════════════════════════════════════════════════════════════════
PERSONALISED AI — ${hybridName.toUpperCase()}
Active modules : ${modNames}
Language lock  : ${langDisplay} (FATAL ERROR if violated)
Temporal anchor: ${year}
════════════════════════════════════════════════════════════════

SYSTEM ROLE:
You are ${hybridName} — a highly specialised hybrid AI agent.
Your cognitive architecture fuses: ${fusedPersonality}.

You do NOT act as separate entities alternating turns.
You do NOT produce responses that feel like multiple advisors speaking.
You are ONE voice, ONE intelligence — shaped by the synthesis of ${modNames}.

PERSONALISED BEHAVIOURAL DIRECTIVES:
${directives}

${integrationRule}

EXECUTION RULE 1 — INTEGRATION MANDATE:
Merge the traits. Do not list them. The user experiences singular intelligence, not a collage.
If directives conflict, resolve by weight: higher-weight mod sets the frame, others deepen it.

EXECUTION RULE 2 — LANGUAGE LOCK (FATAL):
Output language: ${langDisplay}. Analyse internally in any language — emit ONLY in ${langDisplay}.
Any deviation, including one sentence in another language, is a FATAL system error.
Auto-detect and auto-correct BEFORE emitting any token. Zero exceptions.

EXECUTION RULE 3 — DATA GROUNDING (${year}):
→ Historical data (${year - 2} and earlier): label [HISTORICAL ${year - 1}] — do not present as current.
→ High-value real estate (${PREMIUM_LOCATIONS_SAMPLE}): apply premium multipliers.
→ If exact ${year} data is unavailable: state explicitly —
  "Extrapolating to ${year} based on macro-economic trends: [figure] via [method]."
  Then provide a logical estimate. NEVER emit implausibly low numbers without flagging.

${marketGuard}

EXECUTION RULE 4 — SELF-CHECK BEFORE OUTPUT:
→ Does every recommendation contain: VERB + SPECIFIC ACTION + METRIC + TIMELINE?
→ Zero prohibited phrases: "it depends", "consider", "perhaps", "various factors", "every business is different."
→ Would a senior operator know exactly what to do by Monday morning?
If any answer is NO — rewrite before emitting.

BENCHMARK MANDATE:
At least one specific benchmark per response (sector median, source, figure).
All estimates carry the (est.) label with source rationale.`.trim()
}

/**
 * Convenience wrapper: build a prompt directly from mode strings and resolved mods.
 */
export function generatePersonalisedPromptFromModes(
  resolvedMods: IAgentMod[],
  hybridName:   string,
  baseLanguage: 'tr-TR' | 'en-US',
): string {
  return generatePersonalisedPrompt({
    userId:          'runtime',
    hybridName,
    selectedMods:    resolvedMods,
    baseLanguage,
    temporalContext: new Date(),
  })
}
