'use client'

/**
 * components/dashboard/DashboardSkeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-CLS loading placeholder for the Swiss Precision dashboard.
 *
 * Every block mirrors the exact dimensions and spacing of the real
 * SwissPrecisionDashboard Overview tab (hero 220px, 2×2 metric grid, insight
 * banner) so the layout does not shift when live content hydrates in.
 *
 * Design system is preserved: Midnight Navy (#0a1128) shell, glass surfaces,
 * gold hairlines. Shimmer is provided by the shared Skeleton atom.
 */

import type { CSSProperties } from 'react'
import { Skeleton } from '@/components/atoms/Skeleton'

// Glass surface matching the real MetricCard / InsightBanner shell
const glass: CSSProperties = {
  background: 'rgba(10, 17, 40, 0.72)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(196, 154, 60, 0.22)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
}

function MetricCardSkeleton() {
  return (
    <div className="relative rounded-xl p-4 overflow-hidden" style={glass}>
      {/* Gold accent line — same as MetricCard */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #c49a3c 40%, transparent)' }}
      />
      <Skeleton height={10} className="w-1/2 mb-3" />
      <Skeleton height={22} className="w-3/4 mb-2.5" />
      <Skeleton height={11} className="w-2/3" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading dashboard">
      {/* Hero — matches PortofinoHero height (220px) */}
      <Skeleton height={220} rounded="lg" className="w-full" />

      {/* Section label + metric grid */}
      <div>
        <Skeleton height={10} className="w-32 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>

      {/* Insight banner — matches InsightBanner */}
      <div
        className="rounded-xl p-4 flex gap-3"
        style={{
          background: 'rgba(129, 216, 208, 0.07)',
          border: '1px solid rgba(129, 216, 208, 0.20)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Skeleton width={14} height={14} rounded="full" className="shrink-0 mt-0.5" />
        <div className="flex-1">
          <Skeleton height={11} className="w-28 mb-2" />
          <Skeleton height={10} className="w-full mb-1.5" />
          <Skeleton height={10} className="w-4/5" />
        </div>
      </div>

      {/* Benchmark bar placeholder */}
      <div className="rounded-xl p-4" style={glass}>
        <Skeleton height={10} className="w-24 mb-4" />
        <Skeleton height={10} className="w-full mb-2.5" />
        <Skeleton height={10} className="w-full mb-2.5" />
        <Skeleton height={10} className="w-2/3" />
      </div>
    </div>
  )
}

/**
 * Full-screen route-level skeleton. Reproduces the dashboard chrome
 * (fixed header, scroll container padding, bottom nav) so navigating into
 * /dashboard produces no layout shift.
 */
export function DashboardScreenSkeleton() {
  return (
    <>
      {/* Background — identical to dashboard shell */}
      <div className="fixed inset-0 -z-10" style={{ background: '#0a1128' }} />

      {/* Sticky header placeholder */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5"
        style={{
          background: 'rgba(8, 12, 28, 0.82)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderBottom: '1px solid rgba(196, 154, 60, 0.12)',
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Skeleton width={14} height={14} rounded="sm" />
          <Skeleton width={72} height={13} />
        </div>
        <Skeleton width={44} height={12} />
      </header>

      {/* Scroll container — same padding/max-width as real <main> */}
      <main
        className="min-h-screen px-4 pb-24 max-w-full overflow-x-hidden"
        style={{
          paddingTop: 'calc(max(56px, env(safe-area-inset-top, 56px)) + 56px)',
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        <DashboardSkeleton />
      </main>
    </>
  )
}
