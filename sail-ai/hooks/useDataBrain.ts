/**
 * Data Brain™ Integration Hook
 * 
 * Single hook to access all Evolution Layer features.
 * Integrates with existing Aetheris flow.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useAetherisStore } from '@/lib/aetherisStore'
import { useSimulation } from '@/lib/data-brain/simulation'
import { useEventStream } from '@/lib/data-brain/event-stream'
import type { AgentMode } from '@/types/chat'

interface UseDataBrainOptions {
  enableTracking?: boolean
  enableSimulation?: boolean
}

interface UseDataBrainReturn {
  // Simulation
  simulateModes: (modes: AgentMode[]) => Promise<void>
  isSimulating: boolean
  
  // Event Tracking
  track: (type: string, data?: Record<string, unknown>) => void
  trackAgentMode: (mode: AgentMode, confidence: number) => void
  trackAnalysis: (duration: number, confidenceIndex: number) => void
  
  // State
  cognitiveLoad: number
  verbosityTier: 'minimal' | 'balanced' | 'standard'
  activeAlerts: number
}

export function useDataBrain(options: UseDataBrainOptions = {}): UseDataBrainReturn {
  const { 
    enableTracking = true, 
    enableSimulation = true 
  } = options

  const store = useAetherisStore()
  const simulation = useSimulation()
  const eventStream = useEventStream()
  const isSimulatingRef = useRef(false)

  // Initialize tracking on mount
  useEffect(() => {
    if (!enableTracking) return

    eventStream.track('session_initialized', {
      agentMode: store.agentMode,
      cognitiveLoad: store.cognitiveLoadIndex,
    })

    return () => {
      eventStream.track('session_ended', {})
      eventStream.flush()
    }
  }, [enableTracking])

  // Track cognitive load changes
  useEffect(() => {
    if (!enableTracking) return

    const unsubscribe = useAetherisStore.subscribe(
      (state) => state.cognitiveLoadIndex,
      (cognitiveLoad) => {
        if (cognitiveLoad > 80) {
          eventStream.track('high_cognitive_load', { cognitiveLoad })
        }
      }
    )

    return unsubscribe
  }, [enableTracking])

  const simulateModes = useCallback(async (modes: AgentMode[]) => {
    if (!enableSimulation) return

    isSimulatingRef.current = true
    
    try {
      const result = await simulation.simulateModes(modes, {
        context: JSON.stringify(store.baselineMetrics),
        query: 'Strategic analysis request',
      })

      // Store result could be added here
      console.log('[DataBrain] Simulation complete:', result)
    } finally {
      isSimulatingRef.current = false
    }
  }, [enableSimulation, store.baselineMetrics])

  const track = useCallback((type: string, data?: Record<string, unknown>) => {
    if (!enableTracking) return
    eventStream.track(type, data)
  }, [enableTracking])

  const trackAgentMode = useCallback((mode: AgentMode, confidence: number) => {
    if (!enableTracking) return
    eventStream.trackAgentMode(mode.toLowerCase() as AgentMode, confidence)
  }, [enableTracking])

  const trackAnalysis = useCallback((duration: number, confidenceIndex: number) => {
    if (!enableTracking) return
    eventStream.trackAnalysisComplete(
      store.agentMode.toLowerCase() as AgentMode,
      duration,
      confidenceIndex,
      0 // matrix options count - would come from response
    )
  }, [enableTracking, store.agentMode])

  return {
    simulateModes,
    isSimulating: isSimulatingRef.current,
    track,
    trackAgentMode,
    trackAnalysis,
    cognitiveLoad: store.cognitiveLoadIndex,
    verbosityTier: store.verbosityTier(),
    activeAlerts: store.activeAlerts().length,
  }
}

export default useDataBrain
