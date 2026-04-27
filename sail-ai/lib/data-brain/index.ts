/**
 * Data Brain™ Evolution Layer
 * 
 * Sail AI'a entegre edilmiş akıllı veri akışı ve ajan orkestrasyon katmanı.
 * 
 * @module data-brain
 */

// Core Services
export { EventStreamService, useEventStream } from './event-stream'
export { SimulationEngine, useSimulation, MODE_CAPABILITIES } from './simulation'

// Store Extensions
export {
  initialDataBrainState,
  generateTaskId,
  createAgentInstance,
  createAgentTask,
  calculateFocusTrend,
  calculateOverallFocus,
  getNextPendingTask,
  getRunningTasks,
  canProcessMoreTasks,
  // Selectors
  selectActiveAgentCount,
  selectPendingTaskCount,
  selectLatestSimulation,
  selectFocusScoreByDimension,
  selectTopFocusScores,
  selectDecliningFocusScores,
} from './store-extensions'

// Types
export type {
  EventPayload,
  StreamConfig,
} from './event-stream'

export type {
  SimulationSeed,
  SimulationResult,
  ModeComparison,
  ModeCapability,
} from './simulation'

export type {
  AgentTask,
  AgentInstance,
  FocusScore,
  DataBrainState,
  DataBrainActions,
} from './store-extensions'
