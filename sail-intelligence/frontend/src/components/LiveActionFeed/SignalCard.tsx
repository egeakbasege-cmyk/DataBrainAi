/**
 * src/components/LiveActionFeed/SignalCard.tsx
 *
 * Single HITL signal card rendered in the Live Action Feed.
 * States: pending → (approving | rejecting) → resolved
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Badge }  from '@/components/ui/Badge'
import type { HITLSignal } from '@/api/client'

interface SignalCardProps {
  signal:    HITLSignal
  isPending: boolean
  isResolved: boolean
  onApprove: (id: string) => Promise<void>
  onReject:  (id: string, reason?: string) => Promise<void>
  processing?: 'approving' | 'rejecting'
  error?:    string
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
  } catch {
    return iso
  }
}

export function SignalCard({
  signal,
  isPending,
  isResolved,
  onApprove,
  onReject,
  processing,
  error,
}: SignalCardProps) {
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason,    setRejectReason]    = useState('')

  const handleReject = async () => {
    await onReject(signal.action_id, rejectReason)
    setShowRejectInput(false)
    setRejectReason('')
  }

  const statusBadge = isResolved
    ? <Badge variant="muted">Resolved</Badge>
    : isPending
      ? <Badge variant="gold">Pending HITL</Badge>
      : <Badge variant="cyan">Received</Badge>

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className={[
        'card border-l-2 transition-colors duration-300',
        isPending  ? 'border-l-sail-gold  shadow-glow-gold'  : '',
        isResolved ? 'border-l-sail-muted opacity-60'         : '',
        !isPending && !isResolved ? 'border-l-sail-accent'   : '',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge}
          <Badge variant="muted">{signal.action_type}</Badge>
        </div>
        <span className="terminal text-[10px] text-sail-muted shrink-0">
          {formatTime(signal.occurred_at)}
        </span>
      </div>

      {/* Signal ID */}
      <p className="terminal text-xs mb-2 text-sail-muted">
        ID: <span className="text-sail-accent">{signal.action_id}</span>
      </p>

      {/* Payload preview */}
      {Object.keys(signal.payload).length > 0 && (
        <pre className="text-xs font-mono bg-sail-900 rounded-lg p-3 overflow-x-auto
                        text-slate-300 mb-3 border border-sail-700 max-h-36">
          {JSON.stringify(signal.payload, null, 2)}
        </pre>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-sail-danger mb-2">⚠ {error}</p>
      )}

      {/* HITL actions */}
      {isPending && !isResolved && (
        <AnimatePresence mode="wait">
          {!showRejectInput ? (
            <motion.div
              key="buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 flex-wrap mt-1"
            >
              <Button
                size="sm"
                variant="primary"
                loading={processing === 'approving'}
                onClick={() => onApprove(signal.action_id)}
              >
                ✓ Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRejectInput(true)}
                disabled={!!processing}
              >
                ✕ Reject
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="reject-input"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex flex-col gap-2 mt-1"
            >
              <input
                autoFocus
                className="input-field text-xs py-1.5"
                placeholder="Rejection reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReject() }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  loading={processing === 'rejecting'}
                  onClick={handleReject}
                >
                  Confirm Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRejectInput(false)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}
