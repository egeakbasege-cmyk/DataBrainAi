'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'
import { formatCurrency }            from '@/lib/kairos/utils'
import type { KairosAnalysisRecord } from '@/lib/kairos/types'

interface Props { analysis: KairosAnalysisRecord }

// Chart accent colors — intentionally vivid for data differentiation within the dark terminal
// These are chart-only data colors, not used for UI chrome
const CHART_COLORS = ['#C9A96E', '#D4B980', '#4ADE80', '#F87171', '#60A5FA', '#A78BFA', '#FB923C', '#34D399']

// Shared chart axis/grid styles aligned to ae-* tokens
const AXIS_TICK = { fill: 'var(--ae-text-muted)', fontSize: 10 }
const GRID_STROKE = 'var(--ae-border)'
const TOOLTIP_STYLE = {
  background:   'var(--ae-bg-surface)',
  border:       '1px solid var(--ae-border)',
  borderRadius: 8,
  fontSize:     11,
  color:        'var(--ae-text)',
}
const LABEL_STYLE = { color: 'var(--ae-text-dim)', fontSize: 11 }

export function KairosChartsPanel({ analysis }: Props) {
  const raw = analysis.rawData  as any
  const ai  = analysis.aiAnalysis as any

  return (
    <div className="space-y-6">
      {/* Supplier cost matrix */}
      {ai.supplierMatrix?.length > 0 && (
        <ChartCard title="Supplier Cost Matrix" subtitle="Estimated manufacturing cost vs. retail price">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ai.supplierMatrix.slice(0, 6)} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="productTitle" tick={AXIS_TICK} interval={0} angle={-35} textAnchor="end" tickFormatter={(v: string) => v.slice(0, 16)} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE}
                formatter={(v: any, name: any) => [formatCurrency(Number(v)), name === 'retailPrice' ? 'Retail' : 'Est. Cost']}
              />
              <Bar dataKey="retailPrice"   fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Retail" />
              <Bar dataKey="estimatedCost" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} name="Supplier Cost" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Gross margin */}
      {ai.supplierMatrix?.length > 0 && (
        <ChartCard title="Gross Margin %" subtitle="Estimated margin per product">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ai.supplierMatrix.slice(0, 6)} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="productTitle" tick={AXIS_TICK} interval={0} angle={-35} textAnchor="end" tickFormatter={(v: string) => v.slice(0, 16)} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={LABEL_STYLE}
                formatter={(v: any) => [`${v}%`, 'Gross Margin']}
              />
              <Bar dataKey="grossMarginPct" radius={[4, 4, 0, 0]}>
                {ai.supplierMatrix.slice(0, 6).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Tag frequency (Shopify only) */}
      {analysis.platform === 'SHOPIFY' && raw.tagFrequency && (
        <ChartCard title="Top Product Tags" subtitle="Category distribution by frequency">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={Object.entries(raw.tagFrequency as Record<string, number>).slice(0, 8).map(([name, value]) => ({ name, value }))}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
              >
                {Object.entries(raw.tagFrequency).slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: any) => [v, name]} />
              <Legend formatter={(v: string) => <span style={{ color: 'var(--ae-text-dim)', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Competitor threat radar */}
      {ai.vulnerabilities?.length > 0 && (
        <ChartCard title="Competitive Weakness Radar" subtitle="Severity across vulnerability dimensions">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart
              data={ai.vulnerabilities.slice(0, 6).map((v: any) => ({
                subject:  v.category,
                severity: v.severity === 'HIGH' ? 90 : v.severity === 'MEDIUM' ? 55 : 25,
              }))}
              margin={{ top: 4, right: 20, bottom: 4, left: 20 }}
            >
              <PolarGrid stroke={GRID_STROKE} />
              <PolarAngleAxis dataKey="subject" tick={AXIS_TICK} />
              <Radar name="Severity" dataKey="severity"
                stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.20} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="ae-app-card p-4">
      <h3 className="text-sm font-semibold text-[var(--ae-text)]">{title}</h3>
      <p className="text-xs text-[var(--ae-text-muted)] mb-4">{subtitle}</p>
      {children}
    </div>
  )
}
