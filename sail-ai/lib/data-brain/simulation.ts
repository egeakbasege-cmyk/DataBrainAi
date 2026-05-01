/**
 * Data Brain™ Simulation Engine — v2.0 SOVEREIGN
 *
 * Upgraded architecture:
 *
 * 1. WhatIfEngine (NEW — Mirofish-inspired)
 *    Full seed → 5-agent simulation → result card pipeline.
 *    Used by the SCENARIO analysis mode.
 *
 * 2. PredictiveScorer (NEW — Tealium AIStream-inspired)
 *    Real-time customer data signal scoring. Weights simulation results
 *    by customer segment LTV, churn probability, and engagement score.
 *
 * 3. SimulationEngine (existing — upgraded)
 *    Mode capability comparison. Now includes 'scenario' mode and
 *    improved confidence calibration using Sovereign principles.
 *
 * Design principles:
 * - Lightweight: <500ms response time for mode comparisons
 * - Committed: WhatIfEngine always produces specific numbers, never hedges
 * - Transparent: All estimates labelled, reasoning chain always exposed
 * - Sovereign: Ethical audit on every simulation output
 */

import type { AgentMode, AnalysisMode } from '@/types/chat'

// ══════════════════════════════════════════════════════════════════════════════
// TEALIUM-INSPIRED PREDICTIVE SCORER
// Real-time customer data intelligence layer
// ══════════════════════════════════════════════════════════════════════════════

export interface CustomerSignal {
  segment:          string   // 'enterprise' | 'smb' | 'startup' | 'consumer'
  ltv:              number   // £/$ lifetime value
  churnProbability: number   // 0–1
  engagementScore:  number   // 0–100
  daysSinceActive:  number
}

export interface PredictiveScore {
  retentionRisk:    'low' | 'medium' | 'high' | 'critical'
  revenueAtRisk:    number   // £/$ monthly at risk
  recommendedAction: string
  confidenceBoost:  number   // 0–0.15 added to simulation confidence when data present
}

export class PredictiveScorer {
  /**
   * Score customer signals in <100ms (Tealium AIStream principle).
   * Returns weighted simulation parameters.
   */
  static scoreSignals(signals: CustomerSignal[]): PredictiveScore {
    if (!signals.length) {
      return {
        retentionRisk: 'medium',
        revenueAtRisk: 0,
        recommendedAction: 'Collect customer data to enable predictive scoring',
        confidenceBoost: 0,
      }
    }

    const avgChurn  = signals.reduce((s, c) => s + c.churnProbability, 0) / signals.length
    const totalLTV  = signals.reduce((s, c) => s + c.ltv, 0)
    const avgEngage = signals.reduce((s, c) => s + c.engagementScore, 0) / signals.length

    const revenueAtRisk = totalLTV * avgChurn * (1 / 12) // monthly

    const retentionRisk: PredictiveScore['retentionRisk'] =
      avgChurn > 0.5 ? 'critical' :
      avgChurn > 0.3 ? 'high' :
      avgChurn > 0.15 ? 'medium' : 'low'

    const recommendedAction =
      retentionRisk === 'critical'  ? 'Launch emergency retention campaign within 48h' :
      retentionRisk === 'high'      ? 'Segment at-risk cohort and deploy personalised re-engagement' :
      retentionRisk === 'medium'    ? 'Run proactive health-check outreach to low-engagement users' :
                                      'Maintain current onboarding and monitor monthly'

    // More customer data = higher simulation confidence
    const confidenceBoost = Math.min(signals.length * 0.02, 0.15)

    return { retentionRisk, revenueAtRisk, recommendedAction, confidenceBoost }
  }

  /**
   * Unified profile builder — Tealium Identity Graph principle.
   * Merges signals from multiple channels into one enriched profile.
   */
  static buildUnifiedProfile(signals: CustomerSignal[]): Record<string, unknown> {
    if (!signals.length) return {}

    const bySegment = signals.reduce<Record<string, CustomerSignal[]>>((acc, s) => {
      acc[s.segment] = [...(acc[s.segment] || []), s]
      return acc
    }, {})

    return Object.entries(bySegment).reduce<Record<string, unknown>>((acc, [seg, sigs]) => {
      acc[seg] = {
        count:           sigs.length,
        avgLTV:          sigs.reduce((s, c) => s + c.ltv, 0) / sigs.length,
        avgChurn:        sigs.reduce((s, c) => s + c.churnProbability, 0) / sigs.length,
        avgEngagement:   sigs.reduce((s, c) => s + c.engagementScore, 0) / sigs.length,
        atRiskCount:     sigs.filter(c => c.churnProbability > 0.3).length,
      }
      return acc
    }, {})
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WHAT-IF ENGINE — Mirofish Seed → Simulation → Result Card
// Full 5-agent pipeline for the SCENARIO analysis mode
// ══════════════════════════════════════════════════════════════════════════════

export interface WhatIfSeed {
  variable:    string   // What is being changed: 'price', 'headcount', 'channel', 'product', 'market'
  magnitude:   number   // % change (positive = increase, negative = decrease)
  horizon:     number   // Days to project
  baseline:    Record<string, number>  // Current metrics: { revenue, churn, cac, ltv, conversion }
  sector:      string   // 'saas' | 'ecommerce' | 'services' | 'marketplace'
  customerSignals?: CustomerSignal[]
}

export interface AgentSimulation {
  agentName:   string
  finding:     string
  impact:      number   // % impact on primary metric
  confidence:  number   // 0–1
  riskFlag?:   string
}

export interface WhatIfResult {
  scenarioName:    string
  horizon:         number
  primaryPrediction: {
    outcome:       string
    value:         number
    unit:          string
    reasoning:     string  // "Because X → Y → Z" chain
  }
  confidenceIntervals: {
    bestCase:      { probability: number; value: number; condition: string }
    mostLikely:    { probability: number; value: number }
    worstCase:     { probability: number; value: number; trigger: string }
  }
  agentOutputs:    AgentSimulation[]   // 5 agent results
  keyDrivers:      Array<{ driver: string; impact: string }>
  riskFlags:       Array<{ risk: string; consequence: string; mitigation: string }>
  recommendedAction: string
  followUpScenarios: string[]
  overallConfidence: number
  ethicalFlags:    string[]   // Sovereign ethical audit output
}

// Elasticity curves by variable + sector (simplified benchmark data)
const ELASTICITY_BENCHMARKS: Record<string, Record<string, number>> = {
  price: {
    saas:        -0.4,   // 10% price increase → ~4% volume decrease
    ecommerce:   -0.8,
    services:    -0.3,
    marketplace: -0.6,
  },
  headcount: {
    saas:        0.6,    // 10% headcount increase → ~6% output increase
    ecommerce:   0.5,
    services:    0.7,
    marketplace: 0.4,
  },
}

export class WhatIfEngine {
  private static instance: WhatIfEngine
  static getInstance() {
    if (!WhatIfEngine.instance) WhatIfEngine.instance = new WhatIfEngine()
    return WhatIfEngine.instance
  }

  /**
   * Full simulation pipeline: seed → 5 agents → result card
   */
  simulate(seed: WhatIfSeed): WhatIfResult {
    const agents = this.runAgents(seed)
    const confidence = this.calculateConfidence(seed, agents)
    const primaryPrediction = this.synthesisePrimary(seed, agents)
    const ethicalFlags = this.ethicalAudit(seed, primaryPrediction)

    return {
      scenarioName:    `${seed.variable.charAt(0).toUpperCase() + seed.variable.slice(1)} ${seed.magnitude > 0 ? '+' : ''}${seed.magnitude}% Simulation`,
      horizon:         seed.horizon,
      primaryPrediction,
      confidenceIntervals: this.buildIntervals(primaryPrediction, confidence),
      agentOutputs:    agents,
      keyDrivers:      this.rankDrivers(agents),
      riskFlags:       this.aggregateRisks(agents, seed),
      recommendedAction: this.deriveAction(seed, primaryPrediction, confidence),
      followUpScenarios: this.generateFollowUps(seed),
      overallConfidence: confidence,
      ethicalFlags,
    }
  }

  private runAgents(seed: WhatIfSeed): AgentSimulation[] {
    const elasticity = ELASTICITY_BENCHMARKS[seed.variable]?.[seed.sector] ?? -0.5
    const baseRevenue = seed.baseline.revenue ?? 50000

    return [
      // Agent 1: Market Dynamics
      {
        agentName: 'Market Dynamics',
        finding: seed.variable === 'price'
          ? `Price elasticity for ${seed.sector} sector: ${Math.abs(elasticity)} (est.). A ${seed.magnitude}% price change predicts ${Math.round(seed.magnitude * elasticity)}% volume shift.`
          : `Market response to ${seed.variable} change in ${seed.sector}: moderate competitive reaction expected within 30–60 days.`,
        impact: seed.magnitude * elasticity,
        confidence: 0.72,
        riskFlag: seed.magnitude > 20 ? 'Large magnitude may trigger competitor response' : undefined,
      },
      // Agent 2: Customer Behaviour
      {
        agentName: 'Customer Behaviour',
        finding: `Predicted churn delta: ${seed.variable === 'price' && seed.magnitude > 10 ? '+' + (seed.magnitude * 0.3).toFixed(1) + '% churn increase' : 'minimal churn impact'}. Premium segment least price-sensitive. SMB segment most at-risk.`,
        impact: seed.variable === 'price' ? -(seed.magnitude * 0.15) : (seed.magnitude * 0.1),
        confidence: 0.68,
        riskFlag: seed.variable === 'price' && seed.magnitude > 25 ? 'Churn risk crosses critical threshold at >25% increase' : undefined,
      },
      // Agent 3: Financial Model
      {
        agentName: 'Financial Modelling',
        finding: `Net revenue impact: ${seed.magnitude > 0 ? '+' : ''}${(seed.magnitude * (1 + elasticity)).toFixed(1)}% (price effect + volume effect). At current baseline of £${baseRevenue.toLocaleString()}/mo → £${Math.round(baseRevenue * (1 + (seed.magnitude * (1 + elasticity)) / 100)).toLocaleString()}/mo projected.`,
        impact: seed.magnitude * (1 + elasticity),
        confidence: 0.80,
      },
      // Agent 4: Operational Capacity
      {
        agentName: 'Operational Capacity',
        finding: seed.variable === 'headcount'
          ? `Headcount change requires ${seed.magnitude > 0 ? '4–6 week onboarding ramp' : 'severance and knowledge transfer — 2–3 week disruption'}. Productivity impact: delayed by 30 days.`
          : `No significant operational constraint identified for ${seed.variable} change at this magnitude.`,
        impact: seed.variable === 'headcount' ? seed.magnitude * 0.5 : 0,
        confidence: 0.75,
      },
      // Agent 5: Risk Assessment
      {
        agentName: 'Risk Assessment',
        finding: `Irreversibility score: ${seed.variable === 'price' ? '3/10 (reversible)' : seed.variable === 'market' ? '8/10 (high switching cost)' : '4/10 (moderate)'}. Primary tail risk: ${seed.magnitude > 20 ? 'customer defection to competitor during transition' : 'execution delay eroding projected gains'}.`,
        impact: -(Math.abs(seed.magnitude) * 0.1),
        confidence: 0.70,
        riskFlag: `Monitor: ${seed.variable === 'price' ? 'weekly churn rate' : 'monthly revenue retention'} as leading indicator`,
      },
    ]
  }

  private calculateConfidence(seed: WhatIfSeed, agents: AgentSimulation[]): number {
    let base = agents.reduce((s, a) => s + a.confidence, 0) / agents.length
    // Boost for richer baseline data
    const metricCount = Object.keys(seed.baseline).length
    base += Math.min(metricCount * 0.03, 0.15)
    // Boost for customer signals (Tealium layer)
    if (seed.customerSignals?.length) {
      const scored = PredictiveScorer.scoreSignals(seed.customerSignals)
      base += scored.confidenceBoost
    }
    return Math.min(0.93, Math.max(0.40, base))
  }

  private synthesisePrimary(seed: WhatIfSeed, agents: AgentSimulation[]) {
    const financialAgent = agents.find(a => a.agentName === 'Financial Modelling')!
    const netImpact = financialAgent.impact
    const baseRevenue = seed.baseline.revenue ?? 50000
    const projectedRevenue = Math.round(baseRevenue * (1 + netImpact / 100))

    return {
      outcome:   `Net revenue ${netImpact >= 0 ? 'increase' : 'decrease'} of ${Math.abs(netImpact).toFixed(1)}%`,
      value:     projectedRevenue,
      unit:      '£/month (projected)',
      reasoning: `Because ${seed.variable} changes by ${seed.magnitude}% → demand elasticity (${ELASTICITY_BENCHMARKS[seed.variable]?.[seed.sector] ?? 'est. -0.5'}) drives volume shift → net revenue lands at £${projectedRevenue.toLocaleString()}/mo over ${seed.horizon} days.`,
    }
  }

  private buildIntervals(primary: WhatIfResult['primaryPrediction'], confidence: number) {
    const val = primary.value
    const swing = (1 - confidence) * 0.3
    return {
      bestCase:   { probability: 0.25, value: Math.round(val * (1 + swing)), condition: 'Competitor does not respond; customer retention exceeds forecast' },
      mostLikely: { probability: 0.50, value: val },
      worstCase:  { probability: 0.25, value: Math.round(val * (1 - swing)), trigger: 'Churn accelerates beyond elasticity model; execution delay >30 days' },
    }
  }

  private rankDrivers(agents: AgentSimulation[]) {
    return agents
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 3)
      .map(a => ({ driver: a.agentName, impact: `${a.impact >= 0 ? '+' : ''}${a.impact.toFixed(1)}% on primary metric` }))
  }

  private aggregateRisks(agents: AgentSimulation[], seed: WhatIfSeed) {
    return agents
      .filter(a => a.riskFlag)
      .map(a => ({
        risk:        a.riskFlag!,
        consequence: `Could reduce projected outcome by 15–30%`,
        mitigation:  `Track ${seed.variable === 'price' ? 'weekly churn and NPS' : 'monthly retention rate'} as early warning`,
      }))
      .slice(0, 2)
  }

  private deriveAction(seed: WhatIfSeed, primary: WhatIfResult['primaryPrediction'], confidence: number): string {
    if (confidence < 0.55) return `Collect [${seed.variable} baseline data] before proceeding — insufficient confidence for commitment`
    if (primary.value > (seed.baseline.revenue ?? 0)) {
      return `Execute ${seed.variable} change in a phased rollout: test on 20% of customers for 2 weeks, measure churn delta, then full rollout if retention holds`
    }
    return `Delay ${seed.variable} change — simulation projects net revenue decline. Investigate customer elasticity data first.`
  }

  private generateFollowUps(seed: WhatIfSeed): string[] {
    return [
      `What if ${seed.variable} change is combined with a retention campaign?`,
      `What happens if we only apply this change to the ${seed.sector === 'saas' ? 'enterprise' : 'premium'} segment?`,
    ]
  }

  private ethicalAudit(seed: WhatIfSeed, primary: WhatIfResult['primaryPrediction']): string[] {
    const flags: string[] = []
    if (seed.variable === 'price' && seed.magnitude > 30) {
      flags.push('ETHICAL FLAG: Price increase >30% may disproportionately impact SMB customers who cannot absorb the cost. Consider tiered pricing instead.')
    }
    if (seed.variable === 'headcount' && seed.magnitude < -20) {
      flags.push('ETHICAL FLAG: Headcount reduction >20% carries significant human impact. Validate that alternatives (automation, reallocation) have been exhausted.')
    }
    return flags
  }
}

export interface SimulationSeed {
  context: string
  query: string
  constraint?: string
}

export interface ModeCapability {
  mode: AgentMode
  analysisModes: AnalysisMode[]
  strengths: string[]
  timeToValue: 'immediate' | 'days' | 'weeks'
  dataRequirements: 'minimal' | 'moderate' | 'extensive'
  bestFor: string[]
}

export interface SimulationResult {
  mode: AgentMode
  recommendedAnalysisMode: AnalysisMode
  confidence: number
  estimatedTime: number // seconds
  keyOutputs: string[]
  sampleInsight: string
  requirements: string[]
}

export interface ModeComparison {
  modes: AgentMode[]
  results: SimulationResult[]
  recommendation: {
    primary: AgentMode
    secondary?: AgentMode
    reasoning: string
  }
  combinedStrategy?: string
}

// Mode capability definitions (cached, no AI call needed)
export const MODE_CAPABILITIES: Record<AgentMode, ModeCapability> = {
  auto: {
    mode: 'auto',
    analysisModes: ['upwind', 'sail'],
    strengths: ['Adaptive routing', 'Context-aware selection', 'Zero configuration'],
    timeToValue: 'immediate',
    dataRequirements: 'minimal',
    bestFor: ['First-time users', 'Unclear problems', 'Quick insights'],
  },
  strategy: {
    mode: 'strategy',
    analysisModes: ['upwind', 'catamaran', 'trim'],
    strengths: ['Long-term planning', 'Competitive positioning', 'Market analysis'],
    timeToValue: 'weeks',
    dataRequirements: 'extensive',
    bestFor: ['Growth planning', 'Market entry', 'Pivot decisions'],
  },
  analysis: {
    mode: 'analysis',
    analysisModes: ['upwind', 'downwind', 'sail'],
    strengths: ['Benchmark comparison', 'Data validation', 'Trend identification'],
    timeToValue: 'immediate',
    dataRequirements: 'moderate',
    bestFor: ['Performance review', 'Metric validation', 'Problem diagnosis'],
  },
  execution: {
    mode: 'execution',
    analysisModes: ['upwind', 'trim'],
    strengths: ['Action plans', 'Implementation roadmaps', 'Sprint planning'],
    timeToValue: 'days',
    dataRequirements: 'moderate',
    bestFor: ['Immediate action', 'Team alignment', 'OKR planning'],
  },
  review: {
    mode: 'review',
    analysisModes: ['downwind', 'sail'],
    strengths: ['Quality assurance', 'Risk assessment', 'Validation'],
    timeToValue: 'immediate',
    dataRequirements: 'minimal',
    bestFor: ['Pre-launch check', 'Risk review', 'Quality gates'],
  },
}

// Sample insights by mode + context type
const SAMPLE_INSIGHTS: Record<AgentMode, Record<string, string>> = {
  auto: {
    conversion: 'Based on your context, I\'ll route this through analysis mode first, then execution.',
    growth: 'Let me analyze your growth constraints and recommend the best strategic approach.',
    default: 'I\'ll automatically select the most appropriate mode based on your input.',
  },
  strategy: {
    conversion: 'Long-term: Position for 15-20% CVR through loyalty program + UX overhaul. 90-day horizon.',
    growth: 'Market expansion strategy: Identify 2-3 adjacent segments with 3x TAM potential.',
    default: 'Strategic positioning requires deep market analysis and competitive benchmarking.',
  },
  analysis: {
    conversion: 'Your 1.5% CVR is 0.8pp below e-commerce median. Root cause: checkout friction (Baymard data).',
    growth: 'Current growth rate 12% vs sector median 18%. Gap analysis identifies 3 leverage points.',
    default: 'Data-driven analysis comparing your metrics against sector benchmarks.',
  },
  execution: {
    conversion: 'Week 1: Simplify checkout to 3 steps. Week 2: Add recovery email. Target: +0.4pp CVR.',
    growth: '30-day sprint: (1) ICP refinement, (2) Channel test x3, (3) Conversion optimization.',
    default: 'Concrete action plan with specific deliverables and timelines.',
  },
  review: {
    conversion: 'Risk assessment: 3 vulnerabilities in current conversion funnel. Mitigation required.',
    growth: 'Validation check: Growth assumptions vs market reality. 2 red flags identified.',
    default: 'Critical review of strategy with risk identification and quality checks.',
  },
}

export class SimulationEngine {
  private static instance: SimulationEngine

  private constructor() {}

  static getInstance(): SimulationEngine {
    if (!SimulationEngine.instance) {
      SimulationEngine.instance = new SimulationEngine()
    }
    return SimulationEngine.instance
  }

  /**
   * Detect context type from query
   */
  private detectContextType(query: string): string {
    const lower = query.toLowerCase()
    if (lower.includes('conversion') || lower.includes('cvr') || lower.includes('checkout')) {
      return 'conversion'
    }
    if (lower.includes('growth') || lower.includes('revenue') || lower.includes('mrr')) {
      return 'growth'
    }
    if (lower.includes('churn') || lower.includes('retention')) {
      return 'retention'
    }
    return 'default'
  }

  /**
   * Simulate a single mode
   */
  simulateMode(mode: AgentMode, seed: SimulationSeed): SimulationResult {
    const capability = MODE_CAPABILITIES[mode]
    const contextType = this.detectContextType(seed.query)
    
    // Calculate confidence based on data requirements vs provided context
    let confidence = 0.7
    if (seed.context.length > 200) confidence += 0.15
    if (seed.constraint) confidence += 0.1
    confidence = Math.min(0.95, confidence)

    // Estimate time based on mode complexity
    const timeEstimates: Record<AgentMode, number> = {
      auto: 30,
      analysis: 45,
      execution: 60,
      strategy: 90,
      review: 40,
    }

    // Get sample insight
    const sampleInsight = SAMPLE_INSIGHTS[mode][contextType] || SAMPLE_INSIGHTS[mode].default

    // Determine recommended analysis mode
    const recommendedAnalysisMode = capability.analysisModes[0]

    return {
      mode,
      recommendedAnalysisMode,
      confidence,
      estimatedTime: timeEstimates[mode],
      keyOutputs: this.generateKeyOutputs(mode, contextType),
      sampleInsight,
      requirements: this.generateRequirements(capability.dataRequirements),
    }
  }

  /**
   * Simulate multiple modes and compare
   */
  async simulateModes(modes: AgentMode[], seed: SimulationSeed): Promise<ModeComparison> {
    // Simulate all modes
    const results = modes.map((mode) => this.simulateMode(mode, seed))

    // Generate recommendation
    const recommendation = this.generateRecommendation(results, seed)

    // Generate combined strategy if multiple modes
    const combinedStrategy = modes.length > 1 
      ? this.generateCombinedStrategy(results, seed)
      : undefined

    return {
      modes,
      results,
      recommendation,
      combinedStrategy,
    }
  }

  /**
   * Quick simulation for single mode (for UI previews)
   */
  quickSimulate(mode: AgentMode, query: string): SimulationResult {
    return this.simulateMode(mode, {
      context: '',
      query,
    })
  }

  private generateKeyOutputs(mode: AgentMode, contextType: string): string[] {
    const outputs: Record<AgentMode, string[]> = {
      auto: ['Mode recommendation', 'Quick insight', 'Next steps'],
      strategy: ['Strategic positioning', 'Competitive analysis', '90-day roadmap'],
      analysis: ['Benchmark comparison', 'Gap analysis', 'Root cause identification'],
      execution: ['Action matrix', '30-day sprint', 'Success metrics'],
      review: ['Risk assessment', 'Quality checklist', 'Validation report'],
    }
    return outputs[mode]
  }

  private generateRequirements(level: 'minimal' | 'moderate' | 'extensive'): string[] {
    const requirements = {
      minimal: ['Basic business context', 'Primary goal'],
      moderate: ['Current metrics', 'Historical data (optional)', 'Primary constraint'],
      extensive: ['Full metric history', 'Competitive landscape', 'Resource constraints', 'Timeline'],
    }
    return requirements[level]
  }

  private generateRecommendation(
    results: SimulationResult[],
    seed: SimulationSeed,
  ): ModeComparison['recommendation'] {
    // Sort by confidence
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence)
    const primary = sorted[0]

    // Determine if secondary mode would add value
    const secondary = sorted.length > 1 && sorted[1].confidence > 0.75 
      ? sorted[1] 
      : undefined

    // Generate reasoning
    let reasoning = `${primary.mode} mode offers the highest confidence (${Math.round(primary.confidence * 100)}%) `
    reasoning += `for your ${this.detectContextType(seed.query)} query. `
    reasoning += `Time to value: ${primary.estimatedTime}s.`

    if (secondary) {
      reasoning += ` Consider pairing with ${secondary.mode} for comprehensive coverage.`
    }

    return {
      primary: primary.mode,
      secondary: secondary?.mode,
      reasoning,
    }
  }

  private generateCombinedStrategy(results: SimulationResult[], seed: SimulationSeed): string {
    const modes = results.map((r) => r.mode)
    const contextType = this.detectContextType(seed.query)

    if (modes.includes('strategy') && modes.includes('execution')) {
      return 'Dual-track approach: Strategy mode defines the 90-day vision, Execution mode delivers the 30-day sprint. Best for ambitious growth targets.'
    }

    if (modes.includes('analysis') && modes.includes('execution')) {
      return 'Data-driven execution: Analysis validates the problem, Execution delivers the solution. Best for metric-driven improvements.'
    }

    if (modes.includes('strategy') && modes.includes('review')) {
      return 'Validated strategy: Strategy sets the direction, Review ensures quality gates. Best for high-stakes decisions.'
    }

    return `Combined ${modes.join(' + ')} approach for comprehensive coverage.`
  }

  /**
   * Get capability info for a mode (for UI tooltips)
   */
  getModeCapability(mode: AgentMode): ModeCapability {
    return MODE_CAPABILITIES[mode]
  }

  /**
   * Get all available modes
   */
  getAllModes(): AgentMode[] {
    return Object.keys(MODE_CAPABILITIES) as AgentMode[]
  }
}

// React hook — mode comparison
export function useSimulation() {
  return SimulationEngine.getInstance()
}

// React hook — what-if scenario engine
export function useWhatIf() {
  return WhatIfEngine.getInstance()
}

// React hook — Tealium-inspired customer scorer
export function usePredictiveScorer() {
  return PredictiveScorer
}
