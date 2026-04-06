'use client'

interface Props {
  metrics: Record<string, any>
}

const SKIP = new Set(['confidence_source', 'benchmark_category', 'upside_label'])

function formatValue(key: string, value: any): string {
  if (typeof value === 'number') {
    if (key.includes('pct') || key.includes('rate')) return `${value}%`
    if (key.includes('usd') || key.includes('revenue') || key.includes('mrr') ||
        key.includes('price') || key.includes('ltv') || key.includes('cost') ||
        key.includes('gap') || key.includes('monthly') || key.includes('potential')) {
      return `$${value.toLocaleString()}`
    }
    return value.toLocaleString()
  }
  return String(value)
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Pct', '%')
    .replace('Usd', 'USD')
    .replace('Mrr', 'MRR')
    .replace('Ltv', 'LTV')
}

export function MetricsPanel({ metrics }: Props) {
  const entries = Object.entries(metrics).filter(
    ([k, v]) => !SKIP.has(k) && typeof v !== 'object'
  )

  if (entries.length === 0) return null

  const category = metrics.benchmark_category?.replace(/_/g, ' ')

  return (
    <div className="rounded-card overflow-hidden border border-border bg-card"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface">
        <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">
          Benchmark metrics
        </span>
        {category && (
          <span className="font-sans text-xs font-medium capitalize"
            style={{ color: '#A16207' }}>
            {category}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-border">
        {entries.map(([key, value]) => (
          <div key={key} className="px-5 py-4 space-y-1 hover:bg-surface transition-colors">
            <div className="font-sans text-xs text-muted truncate font-medium">
              {formatKey(key)}
            </div>
            <div className="font-heading font-bold text-ink tabular-nums"
              style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
              {formatValue(key, value)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-surface">
        <p className="font-sans text-xs text-muted">
          Computed from industry benchmarks · not estimated by AI
        </p>
      </div>
    </div>
  )
}
