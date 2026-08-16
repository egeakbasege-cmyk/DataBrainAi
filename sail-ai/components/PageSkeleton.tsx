'use client'

/**
 * components/PageSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Route-level loading placeholders.
 *
 * `components/atoms/Skeleton.tsx` is styled for the dark chat surface
 * (`bg-white/5`, white shimmer) and is invisible on the app's default light
 * canvas (`--canvas: #FAFAF8`). These variants use the light tokens so the
 * loading state is actually perceivable on every non-chat route.
 *
 * The shapes intentionally mirror the real layout — a content-shaped skeleton
 * reads as "this is loading" where a centred spinner reads as "this is stuck".
 * Motion is suppressed under `prefers-reduced-motion`.
 */

import React from 'react'

const BASE = 'rgba(12,12,14,0.06)'
const SHEEN = 'linear-gradient(90deg, transparent 0%, rgba(12,12,14,0.045) 50%, transparent 100%)'

export function Bar({
  w = '100%',
  h = 14,
  radius = 8,
  style,
}: { w?: string | number; h?: string | number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className="skeleton-bar"
      style={{ width: w, height: h, borderRadius: radius, background: BASE, position: 'relative', overflow: 'hidden', ...style }}
    >
      <div className="skeleton-sheen" style={{ position: 'absolute', inset: 0, background: SHEEN }} />
    </div>
  )
}

function Card({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(12,12,14,0.07)',
        borderRadius: 18,
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface PageSkeletonProps {
  /** Screen-reader announcement, e.g. "Loading dashboard". */
  label: string
  /** Number of cards in the grid below the header. */
  cards?: number
  /** Render a wide primary panel (chart/table) under the cards. */
  panel?: boolean
}

export function PageSkeleton({ label, cards = 4, panel = true }: PageSkeletonProps) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ minHeight: '100vh', background: '#FAFAF8', padding: '5rem 1.5rem 7rem' }}
    >
      <span className="sr-only">{label}</span>

      <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Bar w={180} h={12} />
          <Bar w="min(26rem, 70%)" h={32} radius={10} />
          <Bar w="min(38rem, 90%)" h={14} />
        </div>

        {/* Card grid */}
        {cards > 0 && (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
            }}
          >
            {Array.from({ length: cards }, (_, i) => (
              <Card key={i}>
                <Bar w={92} h={10} />
                <Bar w="60%" h={26} radius={8} />
                <Bar w="80%" h={10} />
              </Card>
            ))}
          </div>
        )}

        {/* Primary panel */}
        {panel && (
          <Card style={{ gap: '1rem', padding: '1.5rem' }}>
            <Bar w={160} h={16} />
            <Bar h={220} radius={14} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Bar w={110} h={12} />
              <Bar w={90} h={12} />
              <Bar w={130} h={12} />
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
