/**
 * Data Brain™ Evolution Layer - Store Extensions
 * 
 * AetherisStore'a entegre edilen yeni özellikler:
 * - Agent Task Queue
 * - Simulation Results
 * - Event Stream Integration
 * - Focus Score Tracking
 */

import type { AgentMode } from '@/types/chat'
import type { 
  SimulationResult, 
  ModeComparison,
  SimulationSeed 
} from './simulation'

// ── Data Brain Types ───────────────────────────────────────────────────────────

export interface AgentTask {
  id: string
  mode: AgentMode
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number // 1-10
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: unknown
  error?: string
}

export interface AgentInstance {
  mode: AgentMode
  status: 'idle' | 'busy' | 'error'
  currentTask?: string
  lastActivity: number
  metrics: {
    tasksCompleted: number
    avgResponseTime: number
    errorRate: number
  }
}

export interface FocusScore {
  dimension: string
  score: number // 0-100
  trend: 'up' | 'down' | 'stable'
  delta: number // change from last measurement
  lastUpdated: number
}

export interface DataBrainState {
  // Agent Orchestration
  activeAgents: AgentInstance[]
  agentQueue: AgentTask[]
  maxConcurrentAgents: number
  
  // Simulation
  simulationResults: SimulationResult[]
  lastSimulation?: ModeComparison
  
  // Focus Tracking
  focusScores: FocusScore[]
  overallFocusScore: number
  
  // Event Stream
  eventStreamEnabled: boolean
  lastEventTimestamp?: number
}

// ── Data Brain Actions ─────────────────────────────────────────────────────────

export interface DataBrainActions {
  // Agent Queue Management
  queueAgentTask: (mode: AgentMode, priority?: number) => string // returns taskId
  cancelAgentTask: (taskId: string) => void
  processAgentQueue: () => Promise<void>
  clearCompletedTasks: () => void
  
  // Simulation
  runSimulation: (modes: AgentMode[], seed: SimulationSeed) => Promise<ModeComparison | null>
  clearSimulationResults: () => void
  
  // Focus Score
  updateFocusScore: (dimension: string, score: number) => void
  recalculateOverallFocus: () => void
  
  // Event Stream
  setEventStreamEnabled: (enabled: boolean) => void
  trackEvent: (type: string, data?: Record<string, unknown>) => void
}

// ── Initial State ──────────────────────────────────────────────────────────────

export const initialDataBrainState: DataBrainState = {
  activeAgents: [],
  agentQueue: [],
  maxConcurrentAgents: 2,
  simulationResults: [],
  focusScores: [],
  overallFocusScore: 50,
  eventStreamEnabled: true,
}

// ── Helper Functions ───────────────────────────────────────────────────────────

export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createAgentInstance(mode: AgentMode): AgentInstance {
  return {
    mode,
    status: 'idle',
    lastActivity: Date.now(),
    metrics: {
      tasksCompleted: 0,
      avgResponseTime: 0,
      errorRate: 0,
    },
  }
}

export function createAgentTask(mode: AgentMode, priority: number = 5): AgentTask {
  return {
    id: generateTaskId(),
    mode,
    status: 'pending',
    priority,
    createdAt: Date.now(),
  }
}

// ── Focus Score Calculations ───────────────────────────────────────────────────

export function calculateFocusTrend(
  current: number, 
  previous?: number
): { trend: FocusScore['trend']; delta: number } {
  if (previous === undefined) {
    return { trend: 'stable', delta: 0 }
  }
  
  const delta = current - previous
  const threshold = 5 // 5 points change considered significant
  
  if (delta > threshold) return { trend: 'up', delta }
  if (delta < -threshold) return { trend: 'down', delta }
  return { trend: 'stable', delta }
}

export function calculateOverallFocus(scores: FocusScore[]): number {
  if (scores.length === 0) return 50
  
  const weightedSum = scores.reduce((sum, score) => {
    // Recent scores weighted higher
    const age = Date.now() - score.lastUpdated
    const weight = Math.max(0.5, 1 - age / (1000 * 60 * 60 * 24)) // Decay over 24h
    return sum + score.score * weight
  }, 0)
  
  const totalWeight = scores.reduce((sum, score) => {
    const age = Date.now() - score.lastUpdated
    const weight = Math.max(0.5, 1 - age / (1000 * 60 * 60 * 24))
    return sum + weight
  }, 0)
  
  return Math.round(weightedSum / totalWeight)
}

// ── Agent Queue Processing ─────────────────────────────────────────────────────

export function getNextPendingTask(queue: AgentTask[]): AgentTask | undefined {
  return queue
    .filter((t) => t.status === 'pending')
    .sort((a, b) => b.priority - a.priority)[0]
}

export function getRunningTasks(queue: AgentTask[]): AgentTask[] {
  return queue.filter((t) => t.status === 'running')
}

export function canProcessMoreTasks(
  queue: AgentTask[], 
  maxConcurrent: number
): boolean {
  const running = getRunningTasks(queue).length
  return running < maxConcurrent
}

// ── Selectors ───────────────────────────────────────────────────────────────────

export const selectActiveAgentCount = (state: { agentQueue: AgentTask[] }) =>
  getRunningTasks(state.agentQueue).length

export const selectPendingTaskCount = (state: { agentQueue: AgentTask[] }) =>
  state.agentQueue.filter((t) => t.status === 'pending').length

export const selectLatestSimulation = (state: { lastSimulation?: ModeComparison }) =>
  state.lastSimulation

export const selectFocusScoreByDimension = (
  state: { focusScores: FocusScore[] }, 
  dimension: string
) =>
  state.focusScores.find((s) => s.dimension === dimension)

export const selectTopFocusScores = (
  state: { focusScores: FocusScore[] }, 
  limit: number = 5
) =>
  [...state.focusScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

export const selectDecliningFocusScores = (state: { focusScores: FocusScore[] }) =>
  state.focusScores.filter((s) => s.trend === 'down')
