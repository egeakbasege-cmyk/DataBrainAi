/**
 * src/hooks/useHITLQueue.ts
 *
 * HITL queue management hook.
 *
 * Provides approve() and reject() that:
 *  1. Call the backend API endpoint.
 *  2. Optimistically update signalStore on success.
 *  3. Surface errors to the caller without crashing.
 */

import { useState, useCallback } from 'react'
import { api }           from '@/api/client'
import { useSignalStore } from '@/stores/signalStore'

interface HITLActions {
  approve:    (action_id: string) => Promise<void>
  reject:     (action_id: string, reason?: string) => Promise<void>
  processing: Record<string, 'approving' | 'rejecting'>
  errors:     Record<string, string>
}

export function useHITLQueue(): HITLActions {
  const markApproved = useSignalStore((s) => s.markApproved)
  const markRejected = useSignalStore((s) => s.markRejected)

  const [processing, setProcessing] = useState<Record<string, 'approving' | 'rejecting'>>({})
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  const approve = useCallback(async (action_id: string) => {
    setProcessing((p) => ({ ...p, [action_id]: 'approving' }))
    setErrors((e) => { const n = { ...e }; delete n[action_id]; return n })

    try {
      await api.signals.approve(action_id)
      markApproved(action_id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Approval failed'
      setErrors((e) => ({ ...e, [action_id]: msg }))
    } finally {
      setProcessing((p) => { const n = { ...p }; delete n[action_id]; return n })
    }
  }, [markApproved])

  const reject = useCallback(async (action_id: string, reason = '') => {
    setProcessing((p) => ({ ...p, [action_id]: 'rejecting' }))
    setErrors((e) => { const n = { ...e }; delete n[action_id]; return n })

    try {
      await api.signals.reject(action_id, reason)
      markRejected(action_id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Rejection failed'
      setErrors((e) => ({ ...e, [action_id]: msg }))
    } finally {
      setProcessing((p) => { const n = { ...p }; delete n[action_id]; return n })
    }
  }, [markRejected])

  return { approve, reject, processing, errors }
}
