'use client'

import { useEffect, useState } from 'react'
import { Nav } from '@/components/Nav'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

/* ── Types ─────────────────────────────────────────────────── */
interface HistoryEntry {
  id:        string
  prompt:    string
  headline:  string
  target30:  string
  createdAt: string
}

/* ── Helpers ────────────────────────────────────────────────── */
const STORAGE_KEY = 'sail_analysis_history'

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function groupByWeek(entries: HistoryEntry[]) {
  const map: Record<string, number> = {}
  entries.forEach(e => {
    const d = new Date(e.createdAt)
    // ISO week label: "Apr W2"
    const week = `${d.toLocaleString('en', { month: 'short' })} W${Math.ceil(d.getDate() / 7)}`
    map[week] = (map[week] ?? 0) + 1
  })
  return Object.entries(map).map(([week, count]) => ({ week, count }))
}

function groupByMonth(entries: HistoryEntry[]) {
  const map: Record<string, number> = {}
  entries.forEach(e => {
    const label = new Date(e.createdAt).toLocaleString('en', { month: 'short', year: '2-digit' })
    map[label] = (map[label] ?? 0) + 1
  })
  return Object.entries(map).map(([month, count]) => ({ month, count }))
}

/* ── Component ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t } = useLanguage()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [view,    setView]    = useState<'week' | 'month'>('week')

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const weekData  = groupByWeek(history)
  const monthData = groupByMonth(history)
  const chartData = view === 'week' ? weekData : monthData
  const xKey      = view === 'week' ? 'week' : 'month'

  const total   = history.length
  const recent7 = history.filter(e => {
    const d = new Date(e.createdAt)
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
  }).length

  const avgPerWeek = weekData.length
    ? (weekData.reduce((s, d) => s + d.count, 0) / weekData.length).toFixed(1)
    : '0'

  return (
    <main style={{ minHeight: '100vh', background: '#FAFAF8', paddingBottom: '5rem' }}>
      <Nav />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize:   'clamp(1.6rem, 4vw, 2.2rem)',
            fontWeight: 600,
            color:      '#0C0C0E',
            margin:     '0 0 0.25rem',
          }}>
            {t('dash.title')}
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#71717A', margin: 0 }}>
            {t('dash.subtitle')}
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { label: t('dash.analyses'),  value: total,      sub: t('dash.allTime')   },
            { label: t('dash.thisWeek'),  value: recent7,    sub: t('dash.last7Days') },
            { label: t('dash.avgMonthly'),value: avgPerWeek, sub: t('dash.rollingAvg') },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background:   '#FFFFFF',
              border:       '1px solid rgba(0,0,0,0.08)',
              borderRadius: '10px',
              padding:      '1rem',
            }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA', margin: '0 0 0.375rem' }}>
                {label}
              </p>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.8rem', fontWeight: 700, color: '#0C0C0E', margin: '0 0 0.125rem', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#A1A1AA', margin: 0 }}>
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <div style={{
          background:   '#FFFFFF',
          border:       '1px solid rgba(0,0,0,0.08)',
          borderRadius: '10px',
          padding:      '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#0C0C0E', margin: 0, letterSpacing: '0.04em' }}>
              {t('dash.analyseOverTime')}
            </p>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {(['week', 'month'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding:       '0.25rem 0.625rem',
                    borderRadius:  '5px',
                    border:        `1px solid ${view === v ? 'rgba(201,169,110,0.5)' : 'rgba(0,0,0,0.1)'}`,
                    background:    view === v ? 'rgba(201,169,110,0.08)' : 'transparent',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.65rem',
                    fontWeight:    view === v ? 600 : 400,
                    color:         view === v ? '#C9A96E' : '#71717A',
                    cursor:        'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {v === 'week' ? t('dash.weekly') : t('dash.monthly')}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#A1A1AA' }}>
                {t('dash.noDataYet')}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A96E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C9A96E" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey={xKey} tick={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', background: '#fff' }}
                  cursor={{ stroke: 'rgba(201,169,110,0.3)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="count" stroke="#C9A96E" strokeWidth={2} fill="url(#goldGrad)" dot={{ r: 3, fill: '#C9A96E', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Bar chart by month ── */}
        {monthData.length > 1 && (
          <div style={{
            background:   '#FFFFFF',
            border:       '1px solid rgba(0,0,0,0.08)',
            borderRadius: '10px',
            padding:      '1.25rem',
            marginBottom: '1.5rem',
          }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 1.25rem', letterSpacing: '0.04em' }}>
              {t('dash.monthlyBreakdown')}
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fill: '#A1A1AA' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', background: '#fff' }}
                  cursor={{ fill: 'rgba(201,169,110,0.06)' }}
                />
                <Bar dataKey="count" fill="#C9A96E" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── History list ── */}
        <div style={{
          background:   '#FFFFFF',
          border:       '1px solid rgba(0,0,0,0.08)',
          borderRadius: '10px',
          overflow:     'hidden',
        }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#0C0C0E', margin: 0, letterSpacing: '0.04em' }}>
              {t('dash.recentAnalyses')}
            </p>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#A1A1AA', margin: 0 }}>
                No analyses yet. Head to{' '}
                <a href="/chat" style={{ color: '#C9A96E', textDecoration: 'none', fontWeight: 500 }}>Chat →</a>
                {' '}to get started.
              </p>
            </div>
          ) : (
            <div>
              {[...history].reverse().slice(0, 20).map((entry, i) => (
                <div
                  key={entry.id ?? i}
                  style={{
                    padding:    '0.875rem 1.25rem',
                    borderBottom: i < Math.min(history.length, 20) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 500, color: '#0C0C0E', margin: '0 0 0.25rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.headline || entry.prompt}
                      </p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#71717A', margin: '0 0 0.2rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.target30}
                      </p>
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#A1A1AA', margin: 0, flexShrink: 0 }}>
                      {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Clear history ── */}
        {history.length > 0 && (
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY)
                setHistory([])
              }}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear history
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
