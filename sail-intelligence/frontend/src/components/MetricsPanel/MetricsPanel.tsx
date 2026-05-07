/**
 * src/components/MetricsPanel/MetricsPanel.tsx
 *
 * Context-aware KPI panel.
 * Reads the active domain and renders the matching KPI grid from kpi-configs.ts.
 * UI terminology and metrics adapt dynamically — no hardcoded labels.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { KPI_CONFIGS, type Domain, type KPIDefinition } from './kpi-configs'

interface MetricsPanelProps {
  domain:  Domain
  data:    Record<string, number | undefined>
  loading?: boolean
}

// ── Value formatter ───────────────────────────────────────────────────────────
function formatValue(value: number | undefined, kpi: KPIDefinition): string {
  if (value === undefined || value === null) return '—'
  switch (kpi.format) {
    case 'currency': return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    case 'percent':  return value.toFixed(1)
    case 'rank':     return `#${value.toLocaleString()}`
    case 'score':    return value.toFixed(2)
    default:         return value.toLocaleString()
  }
}

// ── Delta indicator ───────────────────────────────────────────────────────────
function DeltaIndicator({ kpi, value }: { kpi: KPIDefinition; value?: number }) {
  if (value === undefined || kpi.highlight === 'neutral') return null
  const isGood = kpi.highlight === 'up_good' ? value >= 0 : value <= 0
  return (
    <span className={['text-xs font-mono', isGood ? 'text-sail-success' : 'text-sail-danger'].join(' ')}>
      {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

// ── Single KPI card ───────────────────────────────────────────────────────────
function KPICard({ kpi, value, index }: { kpi: KPIDefinition; value?: number; index: number }) {
  const displayVal = formatValue(value, kpi)
  const hasData    = value !== undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      title={kpi.description}
      className="card group relative overflow-hidden cursor-default"
    >
      {/* Subtle accent line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sail-accent/40 to-transparent" />

      <p className="section-label mb-2">{kpi.label}</p>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          {hasData ? (
            <>
              <span className="text-2xl font-bold font-mono text-white leading-none">
                {displayVal}
              </span>
              {kpi.unit && (
                <span className="text-xs text-sail-muted font-mono">{kpi.unit}</span>
              )}
            </>
          ) : (
            <span className="text-2xl font-bold font-mono text-sail-muted">—</span>
          )}
        </div>

        {/* Placeholder delta — real deltas would come from time-series comparison */}
        <DeltaIndicator kpi={kpi} value={undefined} />
      </div>

      {/* Shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      bg-gradient-to-br from-sail-accent/5 to-transparent pointer-events-none" />
    </motion.div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="card animate-pulse"
    >
      <div className="h-3 w-24 bg-sail-700 rounded mb-3" />
      <div className="h-7 w-16 bg-sail-700 rounded" />
    </motion.div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export function MetricsPanel({ domain, data, loading = false }: MetricsPanelProps) {
  const config = KPI_CONFIGS[domain] ?? KPI_CONFIGS.default

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Intelligence Layer</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">{config.displayName}</h2>
        </div>
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-xs text-sail-accent"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-sail-accent opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-sail-accent" />
              </span>
              Refreshing
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {loading
          ? config.kpis.map((_, i) => <SkeletonCard key={i} index={i} />)
          : config.kpis.map((kpi, i) => (
              <KPICard
                key={kpi.key}
                kpi={kpi}
                value={data[kpi.key]}
                index={i}
              />
            ))}
      </div>
    </section>
  )
}
