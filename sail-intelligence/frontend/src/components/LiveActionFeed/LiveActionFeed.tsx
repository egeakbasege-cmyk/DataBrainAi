/**
 * src/components/LiveActionFeed/LiveActionFeed.tsx
 *
 * Real-time terminal-style feed of Motor Mode tactical signals.
 *
 * - SSE stream via useSSE hook (started once at Dashboard mount).
 * - Signals rendered as SignalCards with HITL approve/reject controls.
 * - Connection status indicator with colour-coded badge.
 * - Auto-scrolls to newest signal.
 */

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSignalStore }  from '@/stores/signalStore'
import { useHITLQueue }   from '@/hooks/useHITLQueue'
import { SignalCard }      from './SignalCard'
import { Badge }           from '@/components/ui/Badge'
import { Spinner }         from '@/components/ui/Spinner'

export function LiveActionFeed() {
  const signals         = useSignalStore((s) => s.signals)
  const pendingIds      = useSignalStore((s) => s.pendingIds)
  const resolvedIds     = useSignalStore((s) => s.resolvedIds)
  const connectionState = useSignalStore((s) => s.connectionState)

  const { approve, reject, processing, errors } = useHITLQueue()

  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new signal
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [signals.length])

  const pendingCount = pendingIds.size

  return (
    <section className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">Motor Mode</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">
            Live Action Feed
            {pendingCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-2 inline-flex items-center justify-center
                           w-5 h-5 rounded-full bg-sail-gold text-sail-900
                           text-xs font-bold"
              >
                {pendingCount}
              </motion.span>
            )}
          </h2>
        </div>

        {/* Connection badge */}
        <ConnectionBadge state={connectionState} />
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {signals.length === 0 ? (
          <EmptyState connectionState={connectionState} />
        ) : (
          <AnimatePresence initial={false}>
            {signals.map((signal) => (
              <SignalCard
                key={signal.action_id}
                signal={signal}
                isPending={pendingIds.has(signal.action_id)}
                isResolved={resolvedIds.has(signal.action_id)}
                onApprove={approve}
                onReject={reject}
                processing={processing[signal.action_id]}
                error={errors[signal.action_id]}
              />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Stats bar */}
      {signals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-sail-700 flex items-center gap-4 text-xs text-sail-muted font-mono">
          <span>Total: <span className="text-white">{signals.length}</span></span>
          <span>Pending: <span className="text-sail-gold">{pendingCount}</span></span>
          <span>Resolved: <span className="text-sail-success">{resolvedIds.size}</span></span>
        </div>
      )}
    </section>
  )
}

// ── Connection badge ──────────────────────────────────────────────────────────
function ConnectionBadge({ state }: { state: 'connecting' | 'connected' | 'disconnected' }) {
  if (state === 'connected') {
    return (
      <Badge variant="green" className="gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute h-full w-full rounded-full bg-sail-success opacity-75" />
          <span className="relative rounded-full h-1.5 w-1.5 bg-sail-success" />
        </span>
        Live
      </Badge>
    )
  }
  if (state === 'connecting') {
    return (
      <Badge variant="gold" className="gap-1.5">
        <Spinner size="sm" />
        Connecting
      </Badge>
    )
  }
  return <Badge variant="red">Disconnected</Badge>
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ connectionState }: { connectionState: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-3 text-center"
    >
      <div className="w-12 h-12 rounded-full border border-sail-700 flex items-center justify-center">
        <svg className="w-5 h-5 text-sail-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <div>
        <p className="text-sm text-white font-medium">
          {connectionState === 'connecting' ? 'Connecting to signal stream…' : 'No signals yet'}
        </p>
        <p className="text-xs text-sail-muted mt-1">
          Motor Mode anomaly signals will appear here in real-time
        </p>
      </div>
    </motion.div>
  )
}
