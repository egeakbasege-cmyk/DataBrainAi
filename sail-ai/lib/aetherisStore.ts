/**
 * Aetheris State Engine — Zustand Store
 *
 * Single source of truth for the AetherisState across all components.
 * No Provider required — import `useAetherisStore` anywhere.
 *
 * Persistence: session-scoped only (no localStorage) so state is always
 * fresh on a new browser tab, matching the server-side session model.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  AetherisState,
  StrategicVector,
  PredictiveAlert,
  ActionMatrixOption,
  AgentMode,
  SupportedLanguage,
  CognitiveLoadInput,
} from '@/types/architecture'
import { computeCognitiveLoad } from '@/types/architecture'

// ── Extended store shape ───────────────────────────────────────────────────────

interface AetherisStore extends AetherisState {
  // UI state co-located with engine state
  agentMode:    AgentMode
  language:     SupportedLanguage
  isInitialised: boolean

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Initialise or re-initialise the session (called by AetherisProvider on mount). */
  initSession: (sessionId: string, userId: string) => void

  /** Set the active agent mode. */
  setAgentMode: (mode: AgentMode) => void

  /** Set the display language. */
  setLanguage: (lang: SupportedLanguage) => void

  /** Update the cognitive load index directly (from server or client telemetry). */
  setCognitiveLoadIndex: (index: number) => void

  /** Compute and update cognitive load from raw interaction telemetry. */
  computeAndSetCognitiveLoad: (input: CognitiveLoadInput) => void

  /** Set or replace a named baseline metric. */
  setBaselineMetric: (key: string, value: number) => void

  /** Add or update a strategic vector (keyed by dimension). */
  upsertStrategicVector: (vector: StrategicVector) => void

  /** Remove a strategic vector by dimension name. */
  removeStrategicVector: (dimension: string) => void

  /** Add a predictive drift alert. */
  addPredictiveAlert: (alert: PredictiveAlert) => void

  /** Mark an alert as resolved. */
  resolveAlert: (metric: string) => void

  /** Replace the entire state snapshot (from backend hydration). */
  hydrateFromSnapshot: (partial: Partial<AetherisState>) => void

  /** Clear all state back to initial values (new session). */
  resetSession: () => void

  // ── Computed selectors ─────────────────────────────────────────────────────

  /** Returns unresolved alerts only. */
  activeAlerts: () => PredictiveAlert[]

  /** Returns the vector with the largest gap between current and target velocity. */
  dominantVector: () => StrategicVector | null

  /** Returns the vector with the largest gap as a micro-pivot option. */
  dominantMicroPivot: () => ActionMatrixOption | null

  /** Verbosity tier based on current cognitive load: 'minimal' | 'balanced' | 'standard' */
  verbosityTier: () => 'minimal' | 'balanced' | 'standard'
}

// ── Initial state ─────────────────────────────────────────────────────────────

function makeInitialState(): Omit<
  AetherisStore,
  | 'initSession' | 'setAgentMode' | 'setLanguage' | 'setCognitiveLoadIndex'
  | 'computeAndSetCognitiveLoad' | 'setBaselineMetric' | 'upsertStrategicVector'
  | 'removeStrategicVector' | 'addPredictiveAlert' | 'resolveAlert'
  | 'hydrateFromSnapshot' | 'resetSession'
  | 'activeAlerts' | 'dominantVector' | 'dominantMicroPivot' | 'verbosityTier'
> {
  return {
    sessionId:              '',
    userId:                 '',
    cognitiveLoadIndex:     0,
    baselineMetrics:        {},
    activeStrategicVectors: [],
    predictiveDriftAlerts:  [],
    agentMode:              'Auto',
    language:               'en',
    isInitialised:          false,
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAetherisStore = create<AetherisStore>()(
  subscribeWithSelector((set, get) => ({
    ...makeInitialState(),

    // ── Init ─────────────────────────────────────────────────────────────────

    initSession: (sessionId, userId) =>
      set({ sessionId, userId, isInitialised: true }),

    // ── Mode & language ───────────────────────────────────────────────────────

    setAgentMode: (agentMode) => set({ agentMode }),

    setLanguage: (language) => set({ language }),

    // ── Cognitive load ────────────────────────────────────────────────────────

    setCognitiveLoadIndex: (cognitiveLoadIndex) =>
      set({ cognitiveLoadIndex: Math.max(0, Math.min(100, cognitiveLoadIndex)) }),

    computeAndSetCognitiveLoad: (input) =>
      set({ cognitiveLoadIndex: computeCognitiveLoad(input) }),

    // ── Baseline metrics ──────────────────────────────────────────────────────

    setBaselineMetric: (key, value) =>
      set((s) => ({
        baselineMetrics: { ...s.baselineMetrics, [key]: value },
      })),

    // ── Strategic vectors ─────────────────────────────────────────────────────

    upsertStrategicVector: (vector) =>
      set((s) => {
        const existing = s.activeStrategicVectors.findIndex(
          (v) => v.dimension === vector.dimension,
        )
        const updated = [...s.activeStrategicVectors]
        if (existing >= 0) {
          updated[existing] = vector
        } else {
          updated.push(vector)
        }
        return { activeStrategicVectors: updated }
      }),

    removeStrategicVector: (dimension) =>
      set((s) => ({
        activeStrategicVectors: s.activeStrategicVectors.filter(
          (v) => v.dimension !== dimension,
        ),
      })),

    // ── Drift alerts ──────────────────────────────────────────────────────────

    addPredictiveAlert: (alert) =>
      set((s) => {
        // Deduplicate by metric name — replace if exists
        const existing = s.predictiveDriftAlerts.findIndex(
          (a) => a.metric === alert.metric,
        )
        const updated = [...s.predictiveDriftAlerts]
        if (existing >= 0) {
          updated[existing] = alert
        } else {
          updated.push(alert)
        }
        return { predictiveDriftAlerts: updated }
      }),

    resolveAlert: (metric) =>
      set((s) => ({
        predictiveDriftAlerts: s.predictiveDriftAlerts.map((a) =>
          a.metric === metric ? { ...a, isResolved: true } : a,
        ),
      })),

    // ── Snapshot hydration ────────────────────────────────────────────────────

    hydrateFromSnapshot: (partial) =>
      set((s) => ({
        ...s,
        ...partial,
        // Never override userId/sessionId from a partial snapshot
        sessionId: s.sessionId || partial.sessionId || '',
        userId:    s.userId    || partial.userId    || '',
      })),

    // ── Reset ─────────────────────────────────────────────────────────────────

    resetSession: () =>
      set({ ...makeInitialState() }),

    // ── Computed selectors ────────────────────────────────────────────────────

    activeAlerts: () =>
      get().predictiveDriftAlerts.filter((a) => !a.isResolved),

    dominantVector: () => {
      const vectors = get().activeStrategicVectors
      if (!vectors.length) return null
      return vectors.reduce((best, v) =>
        Math.abs(v.targetVelocity - v.currentVelocity) >
        Math.abs(best.targetVelocity - best.currentVelocity)
          ? v
          : best,
      )
    },

    dominantMicroPivot: () => {
      const alerts = get().activeAlerts()
      if (!alerts.length) return null
      const topAlert = alerts.sort(
        (a, b) => b.forecastedDeviation - a.forecastedDeviation,
      )[0]
      return topAlert?.autonomousMicroPivot ?? null
    },

    verbosityTier: () => {
      const idx = get().cognitiveLoadIndex
      if (idx >= 70) return 'minimal'
      if (idx >= 40) return 'balanced'
      return 'standard'
    },
  })),
)

// ── Convenience selectors (stable references, prevent re-renders) ─────────────

export const selectAgentMode      = (s: AetherisStore) => s.agentMode
export const selectCognitiveLoad  = (s: AetherisStore) => s.cognitiveLoadIndex
/**
 * Returns the raw predictiveDriftAlerts array (stable reference).
 * Filter for unresolved alerts locally in the consuming component:
 *   const allAlerts = useAetherisStore(selectActiveAlerts)
 *   const active = allAlerts.filter(a => !a.isResolved)
 * This avoids creating a new array reference on every Zustand update.
 */
export const selectActiveAlerts   = (s: AetherisStore) => s.predictiveDriftAlerts
export const selectVectors        = (s: AetherisStore) => s.activeStrategicVectors
export const selectVerbosityTier  = (s: AetherisStore) => s.verbosityTier()
export const selectIsInitialised  = (s: AetherisStore) => s.isInitialised
