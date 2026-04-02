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
    <div className="rounded-card overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="font-mono text-2xs text-muted uppercase tracking-widest">
          Benchmark metrics
        </span>
        {category && (
          <span className="font-mono text-2xs capitalize"
            style={{ color: '#18b8e0' }}>
            {category}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-border">
        {entries.map(([key, value], i) => (
          <div key={key} className="px-5 py-4 space-y-1">
            <div className="font-mono text-2xs text-muted truncate">
              {formatKey(key)}
            </div>
            <div className="font-heading text-ink tabular-nums"
              style={{ fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
              {formatValue(key, value)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <p className="font-mono text-2xs text-muted">
          Computed from industry benchmarks · not estimated by AI
        </p>
      </div>
    </div>
  )
}
