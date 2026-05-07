/**
 * src/stores/signalStore.ts
 *
 * Zustand store for live Motor Mode signals.
 *
 * Populated by the useSSE hook when the SSE stream delivers events.
 * Consumed by LiveActionFeed and useHITLQueue.
 */

import { create } from 'zustand'
import type { HITLSignal } from '@/api/client'

interface SignalState {
  signals:        HITLSignal[]           // all received signals (newest first)
  pendingIds:     Set<string>            // action_ids awaiting HITL decision
  resolvedIds:    Set<string>            // approved or rejected
  connectionState: 'connecting' | 'connected' | 'disconnected'

  addSignal:      (signal: HITLSignal) => void
  markApproved:   (action_id: string)   => void
  markRejected:   (action_id: string)   => void
  clearResolved:  () => void
  setConnection:  (state: SignalState['connectionState']) => void
}

export const useSignalStore = create<SignalState>()((set, get) => ({
  signals:         [],
  pendingIds:      new Set(),
  resolvedIds:     new Set(),
  connectionState: 'disconnected',

  addSignal: (signal) => {
    set((s) => ({
      signals:    [signal, ...s.signals].slice(0, 200), // cap at 200 signals
      pendingIds: new Set([...s.pendingIds, signal.action_id]),
    }))
  },

  markApproved: (action_id) => {
    set((s) => {
      const pending = new Set(s.pendingIds)
      pending.delete(action_id)
      return {
        pendingIds:  pending,
        resolvedIds: new Set([...s.resolvedIds, action_id]),
      }
    })
  },

  markRejected: (action_id) => {
    set((s) => {
      const pending = new Set(s.pendingIds)
      pending.delete(action_id)
      return {
        pendingIds:  pending,
        resolvedIds: new Set([...s.resolvedIds, action_id]),
      }
    })
  },

  clearResolved: () => set({ resolvedIds: new Set() }),

  setConnection: (connectionState) => set({ connectionState }),
}))
