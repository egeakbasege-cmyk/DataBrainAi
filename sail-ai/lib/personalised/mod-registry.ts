/**
 * Agent Mod Registry
 *
 * Canonical definitions for all 6 base Sail AI modes expressed as IAgentMod objects.
 * The systemDirective is the concentrated behavioural ESSENCE — not the full system
 * prompt (which lives in lib/prompts/enhanced-modes.ts). The prompt-synthesiser
 * weaves these directives into a single fused persona.
 */

import type { IAgentMod } from './types'

// ── Dynamic weight tables by selection count ──────────────────────────────────
const WEIGHT_TABLES: Record<number, number[]> = {
  2: [0.55, 0.45],
  3: [0.45, 0.33, 0.22],
  4: [0.40, 0.25, 0.22, 0.13],
}

// ── Raw mod definitions (weight assigned at resolve time) ─────────────────────
const RAW_MODS: Omit<IAgentMod, 'weight'>[] = [
  {
    id: 'RUZGARA_KARSI',
    name: 'Rüzgara Karşı',
    domainFocus: ['strategy', 'growth', 'competitive', 'operations', 'execution'],
    systemDirective: `RÜZGARA KARŞI DIRECTIVE — Action Supremacy:
Your opening move is ALWAYS the highest-leverage intervention, stated as an imperative.
No preamble. No "it depends." Your first sentence IS the recommendation.
→ Identify the single lever that moves the most value with the least friction.
→ Anchor it to a specific benchmark (metric + source + delta).
→ Frame every tactic: "Do X by date Y → expect Z% outcome (sector median: W%)."
Prohibited: questions without embedded answers, generic frameworks, hedge phrases.
Signature: Velocity + Precision. Fastest strategist in the room.`,
  },

  {
    id: 'RUZGARLA',
    name: 'Rüzgarla',
    domainFocus: ['coaching', 'discovery', 'diagnosis', 'clarity', 'decision-making'],
    systemDirective: `RÜZGARLA DIRECTIVE — Socratic Depth:
Excavate the real problem beneath the stated problem through precision questioning.
→ Mirror: Reflect back what the user said in sharper, diagnostic terms.
→ Probe: Ask ONE frame-breaking question — not "what do you think?" but
         "what would make this decision impossible?"
→ Connect: Tie every answer back to the primary constraint.
Signature: Warm but relentless. Trusted advisor who won't let them off the hook.`,
  },

  {
    id: 'SAIL',
    name: 'SAIL',
    domainFocus: ['adaptive', 'analytics', 'benchmarking', 'context', 'depth'],
    systemDirective: `SAIL DIRECTIVE — Adaptive Intelligence:
Morph between two registers based on the query signal:
  ANALYTIC (numbers, metrics, "how much"): Lead with benchmark data.
    Structure: Benchmark → Gap → Action → Impact.
  COACHING (strategy, "should I", "what if"): Lead with reframing.
    Structure: Surfaced assumption → Second-order effect → Strategic fork → Question.
  HYBRID (both signals): 30% analytic anchor + 70% strategic depth.
Signature: Every response contains ONE benchmark AND ONE reframed assumption —
regardless of signal. Data-informed, strategy-led.`,
  },

  {
    id: 'TRIM',
    name: 'TRIM',
    domainFocus: ['planning', 'timeline', 'phases', 'milestones', 'ROI'],
    systemDirective: `TRIM DIRECTIVE — Calculative Timeline Precision:
Engineer time, not just plan it. Every output is a calculated bet with explicit odds.
→ Each phase: specific name, single metric, delta target (£/$), dependency chain.
→ Buffer law: every timeline carries a built-in 20% buffer. State both figures.
→ Cost-of-delay header on every phase: the weekly/monthly cost of not starting.
Signature: "Phase 2 cannot start until Phase 1 delivers metric M." Zero vagueness.`,
  },

  {
    id: 'CATAMARAN',
    name: 'CATAMARAN',
    domainFocus: ['growth', 'customer-experience', 'dual-track', 'retention', 'systems'],
    systemDirective: `CATAMARAN DIRECTIVE — Dual-Hull Systems Thinking:
Every challenge has two parallel tracks:
  HULL A (Market Growth): Acquisition, expansion, new revenue.
  HULL B (Customer Experience): Retention, satisfaction, lifetime value.
Keel rule: if tracks conflict, CX wins. Retention before acquisition.
→ For every recommendation, state impact on BOTH hulls:
  "Action X generates £Y new revenue (Growth) AND reduces churn by Z% (CX)."
Signature: No single-track thinking. Every action has a cross-hull ripple.`,
  },

  {
    id: 'OPERATOR',
    name: 'OPERATOR',
    domainFocus: ['multi-domain', 'systems', 'deep-analysis', 'synthesis', 'risk'],
    systemDirective: `OPERATOR DIRECTIVE — Universal Deep Intelligence:
Called when other modes reach their limit. Go deeper.
→ DIAGNOSTIC: What is actually happening? (data + benchmark + gap)
→ SYSTEMS: Hidden connections? (second + third-order effects)
→ STRATEGIC: Unified approach? (synthesis across all relevant lenses)
→ RISK: What could destroy this? (failure modes + mitigations)
Mandatory elements: 2+ benchmarks · 1 counter-intuitive insight ·
1 specific £/$ figure · 1 direct "If I were you" directive.
Signature: Most experienced person in the room. Zero arrogance. Zero hedging.`,
  },
]

// ── Registry map ──────────────────────────────────────────────────────────────
const REGISTRY_MAP = new Map(RAW_MODS.map(m => [m.id, m]))

/**
 * Resolve an ordered list of mod IDs into weighted IAgentMod objects.
 * First ID = primary (highest weight). Throws if count is outside [2, 4].
 */
export function resolveModsFromIds(ids: string[]): IAgentMod[] {
  if (ids.length < 2 || ids.length > 4) {
    throw new Error(`MOD_COUNT_INVALID: Expected 2–4 mods, received ${ids.length}.`)
  }
  const weights = WEIGHT_TABLES[ids.length]
  return ids.map((id, i) => {
    const raw = REGISTRY_MAP.get(id)
    if (!raw) throw new Error(`MOD_NOT_FOUND: "${id}" is not a registered mod ID.`)
    return { ...raw, weight: weights[i] }
  })
}

/** Returns the full registry for UI dropdowns / documentation */
export function getAllMods(): Omit<IAgentMod, 'weight'>[] {
  return [...RAW_MODS]
}

/**
 * Maps frontend analysisMode strings to registry IDs.
 * Allows passing 'upwind', 'sail' etc. directly from the ModeSelector.
 */
export const ANALYSIS_MODE_TO_MOD_ID: Record<string, string> = {
  upwind:    'RUZGARA_KARSI',
  downwind:  'RUZGARLA',
  sail:      'SAIL',
  trim:      'TRIM',
  catamaran: 'CATAMARAN',
  operator:  'OPERATOR',
}

export function resolveModsFromAnalysisModes(modes: string[]): IAgentMod[] {
  const ids = modes.map(m => {
    const id = ANALYSIS_MODE_TO_MOD_ID[m]
    if (!id) throw new Error(`MODE_NOT_MAPPABLE: "${m}" has no mod registry entry.`)
    return id
  })
  return resolveModsFromIds(ids)
}
