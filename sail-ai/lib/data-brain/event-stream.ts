/**
 * Data Brain™ EventStream Service
 * 
 * Lightweight event tracking for the Evolution Layer.
 * Uses EventSource (SSE) for real-time updates, fetch for events.
 * 
 * Design decisions:
 * - No socket.io: Too heavy for our use case
 * - Batch processing: Events are buffered and sent in batches
 * - Session-scoped: No persistent storage, privacy-friendly
 */

import { useAetherisStore } from '@/lib/aetherisStore'

interface EventPayload {
  type: string
  timestamp: number
  sessionId: string
  userId?: string
  data: Record<string, unknown>
}

interface EventBatch {
  events: EventPayload[]
  sentAt: number
}

interface StreamConfig {
  batchSize: number
  flushInterval: number
  endpoint: string
}

const DEFAULT_CONFIG: StreamConfig = {
  batchSize: 10,
  flushInterval: 5000, // 5 seconds
  endpoint: '/api/data-brain/events',
}

class EventStreamService {
  private static instance: EventStreamService
  private buffer: EventPayload[] = []
  private config: StreamConfig
  private flushTimer: NodeJS.Timeout | null = null
  private sessionId: string = ''
  private isEnabled: boolean = false

  private constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initSession()
  }

  static getInstance(config?: Partial<StreamConfig>): EventStreamService {
    if (!EventStreamService.instance) {
      EventStreamService.instance = new EventStreamService(config)
    }
    return EventStreamService.instance
  }

  private initSession(): void {
    // Get session from AetherisStore if available
    const store = useAetherisStore.getState()
    this.sessionId = store.sessionId || this.generateSessionId()
    this.isEnabled = store.isInitialised

    // Subscribe to store changes
    useAetherisStore.subscribe(
      (state: { sessionId: string; isInitialised: boolean }) => ({ sessionId: state.sessionId, isInitialised: state.isInitialised }),
      (state: { sessionId: string; isInitialised: boolean }) => {
        this.sessionId = state.sessionId || this.sessionId
        this.isEnabled = state.isInitialised
      },
    )
  }

  private generateSessionId(): string {
    return `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Track an event
   */
  track(type: string, data: Record<string, unknown> = {}): void {
    if (!this.isEnabled) return

    const event: EventPayload = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data,
    }

    this.buffer.push(event)

    if (this.buffer.length >= this.config.batchSize) {
      this.flush()
    } else if (!this.flushTimer) {
      this.scheduleFlush()
    }
  }

  /**
   * Track agent mode selection
   */
  trackAgentMode(mode: string, confidence: number, context?: string): void {
    this.track('agent_mode_selected', {
      mode,
      confidence,
      context: context?.slice(0, 200), // Limit context size
    })
  }

  /**
   * Track analysis completion
   */
  trackAnalysisComplete(
    mode: string,
    duration: number,
    confidenceIndex: number,
    matrixOptionsCount: number,
  ): void {
    this.track('analysis_complete', {
      mode,
      duration,
      confidenceIndex,
      matrixOptionsCount,
    })
  }

  /**
   * Track simulation run
   */
  trackSimulation(modes: string[], duration: number, result: 'success' | 'error'): void {
    this.track('simulation_run', {
      modes,
      modeCount: modes.length,
      duration,
      result,
    })
  }

  /**
   * Track user interaction for cognitive load calculation
   */
  trackInteraction(type: 'click' | 'scroll' | 'input' | 'hover', element: string): void {
    this.track('user_interaction', {
      interactionType: type,
      element: element.slice(0, 50),
    })
  }

  private scheduleFlush(): void {
    this.flushTimer = setTimeout(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  /**
   * Flush buffered events to server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    const batch: EventBatch = {
      events: [...this.buffer],
      sentAt: Date.now(),
    }

    this.buffer = []

    try {
      // Use sendBeacon if available for reliable delivery
      const payload = JSON.stringify(batch)
      
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(this.config.endpoint, blob)
      } else {
        // Fallback to fetch
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        })
      }
    } catch (error) {
      // Silently fail - don't break user experience for analytics
      console.debug('[EventStream] Failed to send events:', error)
    }
  }

  /**
   * Get current buffer size (for debugging)
   */
  getBufferSize(): number {
    return this.buffer.length
  }

  /**
   * Force flush and cleanup
   */
  destroy(): void {
    this.flush()
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
    }
  }
}

// React hook for easy usage
export function useEventStream() {
  return EventStreamService.getInstance()
}

export { EventStreamService }
export type { EventPayload, StreamConfig }
