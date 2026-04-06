'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Props {
  metrics: Record<string, any>
}

function toChartData(metrics: Record<string, any>) {
  const numeric: { name: string; value: number }[] = []

  for (const [key, val] of Object.entries(metrics)) {
    const num = typeof val === 'number' ? val : parseFloat(String(val))
    if (!isNaN(num) && num > 0 && num < 1_000_000) {
      // Humanise the key name
      const name = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 22)
      numeric.push({ name, value: num })
    }
  }

  return numeric.slice(0, 6)
}

const BAR_COLORS = ['#FACC15', '#FDE68A', '#FEF3C7', '#FACC15', '#FDE68A', '#FEF3C7']

export function MetricsChart({ metrics }: Props) {
  const data = toChartData(metrics)
  if (data.length < 2) return null

  return (
    <div className="bg-card rounded-card border border-border p-5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <p className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2 mb-4">
        Key metrics
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background:   '#FFFFFF',
              border:       '1px solid #E5E7EB',
              borderRadius: 10,
              fontSize:     12,
              fontFamily:   'Inter, sans-serif',
              boxShadow:    '0 4px 16px rgba(0,0,0,0.08)',
            }}
            cursor={{ fill: 'rgba(250,204,21,0.06)' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_entry, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
