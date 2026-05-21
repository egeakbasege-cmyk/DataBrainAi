/**
 * lib/pipeline/modelSelector.ts — Adaptive Model & Token Budget Router
 * ──────────────────────────────────────────────────────────────────────
 * Selects the optimal Groq model and token budget for each request based
 * on query complexity signals, analysis mode, and injected context size.
 *
 * Design principles:
 *  • Pure heuristics — zero LLM calls, zero latency overhead (~0ms)
 *  • Edge-runtime compatible — no Node.js APIs, no external I/O
 *  • Conservative by default: uncertain → primary model
 *  • Token-aware: right-sizes budgets to prevent TPM limit hits
 *  • Language-transparent: Turkish and English signals equally weighted
 *
 * Complexity tiers → model + token budget:
 *  SIMPLE   → short clarification / coaching question  → 8B  @  600 tokens
 *  STANDARD → single-domain analysis (default)         → 70B @ 1100 tokens
 *  COMPLEX  → multi-domain or financial modeling       → 70B @ 1350 tokens
 *  CRITICAL → synergy/operator/scenario or 3+ signals  → 70B @ 1500 tokens
 *
 * Token budget philosophy:
 *  The on_demand Groq tier allows ~12,000 TPM. A typical request uses:
 *    System prompt   ≈  600–900 tokens
 *    User message    ≈  100–600 tokens (+ research context)
 *    Output          ≈  600–1500 tokens (from max_tokens)
 *    Total           ≈  1300–3000 tokens per request
 *
 *  With adaptive budgets we avoid the 413 (context too long) and 429
 *  (TPM exceeded) errors that hit the previous fixed-1200-token approach.
 */

// ── Model identifiers ─────────────────────────────────────────────────────────

export const MODEL_PRIMARY  = 'llama-3.3-70b-versatile'  // 12K TPM on_demand, 70B params
export const MODEL_FAST     = 'llama-3.1-8b-instant'     // 500K TPD, 8B params — 5× daily cap

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComplexityTier = 'SIMPLE' | 'STANDARD' | 'COMPLEX' | 'CRITICAL'

export interface ModelSelection {
  model:       string
  maxTokens:   number
  temperature: number
  tier:        ComplexityTier
  rationale:   string
}

// ── Complexity signal matchers ─────────────────────────────────────────────────
// Each regex captures a distinct dimension of query complexity.
// Signals are additive — more signals → higher tier.

const SIGNAL = {
  // Mentions two or more business domains (TR + EN)
  multiDomain: /(?:(?:market(?:ing)?|sales|finance|operat|supply|legal|hr|growth|risk|crm|teknik|pazarlama|finans|operasyon|büyüme|satış|tedarik|insan\s*kaynakları)\b[\s\S]*){2}/i,

  // Specific financial / business metrics
  financial: /\b(?:ebitda|arr|mrr|cac|ltv|payback|runway|burn\s*rate?|valuation|değerleme|irr|npv|dcf|gross\s*margin|net\s*margin|churn|roas|roi|aov|arppu|nps|kar\s*marj|brüt\s*kâr)\b/i,

  // Scenario / predictive / "what if" analysis
  scenario: /\b(?:if|eğer|what\s*if|ne\s*ol(?:ur|sa)|senaryo|scenario|predict(?:ion)?|forecast|tahmin|model(?:leme)?|simüle|simulate?|proje(?:ksi)?|projection)\b/i,

  // Competitive intelligence
  competitive: /\b(?:competitor|rakip|benchmark|compare|karşılaştır|vs\.?|kıyasla|pazar\s*pay[ıi]|market\s*share|positioning|konumland)\b/i,

  // Structural / strategic transformation
  structural: /\b(?:pivot|acquisition|merger|satın\s*alma|birleşme|restructure|yeniden\s*yapılandır|iş\s*modeli\s*değişikliği|strateji\s*değişikliği|spin.?off|joint\s*venture)\b/i,

  // Simple: short single-sentence query
  short: (q: string) => q.trim().length < 130,

  // Definitional / clarification questions (almost always simple)
  definitional: /\b(?:ne(?:dir|demek|yi|yle|ye)?|nedir|nasıl(?:dır)?|what\s+is|how\s+does|explain|tanımla|açıkla|anlat|define)\b/i,
} as const

// ── Modes that always need the primary model ───────────────────────────────────
// These modes synthesise multiple domains or simulate multi-agent reasoning.
const ALWAYS_PRIMARY = new Set(['synergy', 'operator', 'scenario', 'catamaran'])

// ── Modes eligible for the fast model on simple queries ───────────────────────
// Downwind is Socratic coaching — clarification questions are typically simple.
const FAST_ELIGIBLE   = new Set(['downwind'])

// ── Per-mode base configuration ────────────────────────────────────────────────
// Defaults for STANDARD tier. COMPLEX and CRITICAL add token headroom.

interface ModeConfig { temperature: number; maxTokens: number }

const MODE_BASE: Record<string, ModeConfig> = {
  upwind:    { temperature: 0.40, maxTokens: 1100 },
  downwind:  { temperature: 0.50, maxTokens:  850 },
  sail:      { temperature: 0.45, maxTokens: 1150 },
  trim:      { temperature: 0.40, maxTokens:  900 },
  catamaran: { temperature: 0.35, maxTokens: 1100 },
  operator:  { temperature: 0.50, maxTokens: 1300 },
  synergy:   { temperature: 0.45, maxTokens: 1300 },
  scenario:  { temperature: 0.50, maxTokens: 1400 },
}

const DEFAULT_BASE: ModeConfig = { temperature: 0.40, maxTokens: 1200 }

// ── Context size → complexity boost ───────────────────────────────────────────
// Large injected context (research results, file uploads) signals complexity
// because the model must synthesise more information.

function contextSignal(contextChars: number): number {
  if (contextChars > 4000) return 2
  if (contextChars > 1500) return 1
  return 0
}

// ── Main selector ──────────────────────────────────────────────────────────────

/**
 * @param query        Raw user query string
 * @param mode         Analysis mode (upwind | downwind | sail | ...)
 * @param contextChars Total character count of injected context
 *                     (ragContext length + fileContent length)
 */
export function selectModel(
  query:        string,
  mode:         string,
  contextChars: number = 0,
): ModelSelection {
  const base = MODE_BASE[mode] ?? DEFAULT_BASE

  // ── Critical modes: always primary, highest budget ──────────────────────
  if (ALWAYS_PRIMARY.has(mode)) {
    return {
      model:       MODEL_PRIMARY,
      maxTokens:   base.maxTokens,
      temperature: base.temperature,
      tier:        'CRITICAL',
      rationale:   `${mode} requires full reasoning depth`,
    }
  }

  // ── Count complexity signals ─────────────────────────────────────────────
  const signals = [
    SIGNAL.multiDomain.test(query),
    SIGNAL.financial.test(query),
    SIGNAL.scenario.test(query),
    SIGNAL.competitive.test(query),
    SIGNAL.structural.test(query),
  ].filter(Boolean).length + contextSignal(contextChars)

  // ── SIMPLE: fast model eligible ──────────────────────────────────────────
  // Conditions: eligible mode + short query + zero complexity signals
  if (
    FAST_ELIGIBLE.has(mode) &&
    SIGNAL.short(query) &&
    signals === 0 &&
    SIGNAL.definitional.test(query)
  ) {
    return {
      model:       MODEL_FAST,
      maxTokens:   600,
      temperature: base.temperature,
      tier:        'SIMPLE',
      rationale:   'short coaching clarification — fast model sufficient',
    }
  }

  // ── CRITICAL: 3+ signals → primary model, maximum budget ────────────────
  if (signals >= 3) {
    return {
      model:       MODEL_PRIMARY,
      maxTokens:   Math.min(base.maxTokens + 300, 1500),
      temperature: base.temperature,
      tier:        'CRITICAL',
      rationale:   `${signals} complexity signals — maximum reasoning depth`,
    }
  }

  // ── COMPLEX: 2 signals → primary model, expanded budget ─────────────────
  if (signals === 2) {
    return {
      model:       MODEL_PRIMARY,
      maxTokens:   Math.min(base.maxTokens + 150, 1400),
      temperature: base.temperature,
      tier:        'COMPLEX',
      rationale:   `${signals} complexity signals — expanded analysis budget`,
    }
  }

  // ── STANDARD: default ────────────────────────────────────────────────────
  return {
    model:       MODEL_PRIMARY,
    maxTokens:   base.maxTokens,
    temperature: base.temperature,
    tier:        'STANDARD',
    rationale:   'standard single-domain analysis',
  }
}
