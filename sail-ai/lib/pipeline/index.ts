/**
 * lib/pipeline/index.ts — Pipeline entry point
 * ──────────────────────────────────────────────
 * Single import surface for the 5-layer Stateful Graph Pipeline.
 *
 * Usage:
 *   import { runPipeline } from '@/lib/pipeline'
 *   const output = await runPipeline(config)
 */

export { orchestrate as runPipeline } from './graphOrchestrator'
export { routeAndOptimize }           from './semanticRouter'
export { validateOutput }             from './validator'
export { humanize, buildScopeMetadata } from './humanizer'

export type {
  PipelineConfig,
  PipelineOutput,
  PipelineState,
  OptimizedIntent,
  ValidatedOutput,
  HumanizedResponse,
  ScopeMetadata,
  RevenueTier,
  NodeStatus,
} from './types'
