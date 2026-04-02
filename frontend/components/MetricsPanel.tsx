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

  return (
    <div className="bg-bg border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-muted uppercase tracking-widest">
          Computed Metrics
        </h3>
        <span className="text-xs text-muted font-mono">
          {metrics.benchmark_category?.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="bg-card border border-border rounded-chip px-3 py-2.5">
            <div className="text-xs text-muted font-mono mb-0.5 truncate">{formatKey(key)}</div>
            <div className="text-white font-mono font-medium text-sm">
              {formatValue(key, value)}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted font-mono mt-3">
        Computed from industry benchmarks · not estimated by AI
      </p>
    </div>
  )
}
