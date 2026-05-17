'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'
import { formatCurrency }            from '@/lib/kairos/utils'
import type { KairosAnalysisRecord } from '@/lib/kairos/types'

interface Props { analysis: KairosAnalysisRecord }

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e']

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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
              <XAxis dataKey="productTitle" tick={{ fill: '#71717a', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" tickFormatter={(v: string) => v.slice(0, 16)} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#0f0f12', border: '1px solid #1e1e24', borderRadius: 8 }}
                labelStyle={{ color: '#fafafa', fontSize: 11 }}
                formatter={(v: any, name: any) => [formatCurrency(Number(v)), name === 'retailPrice' ? 'Retail' : 'Est. Cost']}
              />
              <Bar dataKey="retailPrice"   fill="#6366f1" radius={[4, 4, 0, 0]} name="Retail" />
              <Bar dataKey="estimatedCost" fill="#ec4899" radius={[4, 4, 0, 0]} name="Supplier Cost" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Gross margin */}
      {ai.supplierMatrix?.length > 0 && (
        <ChartCard title="Gross Margin %" subtitle="Estimated margin per product">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ai.supplierMatrix.slice(0, 6)} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
              <XAxis dataKey="productTitle" tick={{ fill: '#71717a', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" tickFormatter={(v: string) => v.slice(0, 16)} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#0f0f12', border: '1px solid #1e1e24', borderRadius: 8 }}
                labelStyle={{ color: '#fafafa', fontSize: 11 }}
                formatter={(v: any) => [`${v}%`, 'Gross Margin']}
              />
              <Bar dataKey="grossMarginPct" radius={[4, 4, 0, 0]}>
                {ai.supplierMatrix.slice(0, 6).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f0f12', border: '1px solid #1e1e24', borderRadius: 8 }}
                formatter={(v: any, name: any) => [v, name]}
              />
              <Legend formatter={(v: string) => <span style={{ color: '#a1a1aa', fontSize: 11 }}>{v}</span>} />
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
              <PolarGrid stroke="#1e1e24" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
              <Radar name="Severity" dataKey="severity" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f0f12] border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="text-xs text-zinc-600 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}
