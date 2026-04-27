/**
 * Data Brain™ Simulation Engine
 * 
 * Mirofish-inspired scenario testing for Sail AI agent modes.
 * Allows users to compare different agent modes before committing.
 * 
 * Design principles:
 * - Lightweight: Uses cached/simulated responses, not full AI calls
 * - Fast: <500ms response time
 * - Informative: Clear comparison of mode capabilities
 */

import type { AgentMode, AnalysisMode } from '@/types/chat'

interface SimulationSeed {
  context: string
  query: string
  constraint?: string
}

interface ModeCapability {
  mode: AgentMode
  analysisModes: AnalysisMode[]
  strengths: string[]
  timeToValue: 'immediate' | 'days' | 'weeks'
  dataRequirements: 'minimal' | 'moderate' | 'extensive'
  bestFor: string[]
}

interface SimulationResult {
  mode: AgentMode
  recommendedAnalysisMode: AnalysisMode
  confidence: number
  estimatedTime: number // seconds
  keyOutputs: string[]
  sampleInsight: string
  requirements: string[]
}

interface ModeComparison {
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
const MODE_CAPABILITIES: Record<AgentMode, ModeCapability> = {
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

class SimulationEngine {
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

// React hook
export function useSimulation() {
  return SimulationEngine.getInstance()
}

export { SimulationEngine, MODE_CAPABILITIES }
export type { 
  SimulationSeed, 
  SimulationResult, 
  ModeComparison, 
  ModeCapability 
}
