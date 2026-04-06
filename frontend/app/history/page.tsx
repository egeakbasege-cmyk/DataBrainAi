'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAnalyses, getAnalysis } from '../../lib/api'
import { StrategyResultView } from '../../components/StrategyResult'
import { ConfidenceBadge } from '../../components/ConfidenceBadge'
import { Dock } from '../../components/Dock'

interface AnalysisSummary {
  id:            string
  created_at:    string
  input_preview: string
  headline:      string
  confidence:    number
  intent:        string
}

interface FullAnalysis {
  id:             string
  created_at:     string
  input:          string
  intent:         string
  confidence:     number
  metrics:        Record<string, any>
  result:         any
  pipeline_steps: any[]
  duration_ms:    number
  cache_hit:      boolean
}

const INTENT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  growth:         { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  monetisation:   { bg: '#FEFCE8', color: '#A16207', border: '#FEF08A' },
  retention:      { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  pricing:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  acquisition:    { bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' },
  cost_reduction: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
}

function SkeletonRow() {
  return (
    <div className="bg-card rounded-card border border-border px-5 py-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="skeleton h-6 w-20 rounded-pill" />
        <div className="skeleton h-4 w-28 rounded" />
      </div>
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
    </div>
  )
}

export default function HistoryPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [analyses,   setAnalyses]   = useState<AnalysisSummary[]>([])
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [fullData,   setFullData]   = useState<Record<string, FullAnalysis>>({})
  const [loading,    setLoading]    = useState(true)
  const [loadingId,  setLoadingId]  = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/history')
    }
  }, [sessionStatus, router])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    const token = (session as any)?.accessToken || ''
    setFetchError(null)
    getAnalyses(token)
      .then((data) => setAnalyses(data.analyses || []))
      .catch(() => setFetchError('Failed to load history. Please refresh.'))
      .finally(() => setLoading(false))
  }, [sessionStatus, session])

  const handleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (fullData[id]) return

    setLoadingId(id)
    const token = (session as any)?.accessToken || ''
    try {
      const data = await getAnalysis(id, token)
      setFullData((prev) => ({ ...prev, [id]: data }))
    } catch {
      // fail silently — show retry in expanded section
    } finally {
      setLoadingId(null)
    }
  }

  const esc = (s: unknown): string =>
    String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  const handleDownload = (id: string) => {
    const data = fullData[id]
    if (!data) return
    const result = data.result || {}
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Strategy Report — Starcoins</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 680px; margin: 60px auto; padding: 0 24px; color: #111827; line-height: 1.7; background: #fff; }
    h1 { font-size: 2rem; margin-bottom: 0.25em; letter-spacing: -0.02em; }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 2.5em; color: #9CA3AF; border-bottom: 1px solid #F3F4F6; padding-bottom: 0.5em; font-weight: 600; }
    p { margin: 0.75em 0; color: #6B7280; }
    .upside { display: inline-block; padding: 4px 14px; background: #FEFCE8; border: 1px solid #FEF08A; border-radius: 999px; font-size: 0.75rem; font-weight: 700; color: #A16207; margin-bottom: 1em; }
    .action { margin: 1.5em 0; padding: 1em 1.25em; border-left: 3px solid #FACC15; background: #FEFCE8; border-radius: 0 8px 8px 0; }
    .action h3 { margin: 0 0 0.5em; font-size: 1rem; color: #111827; }
    .meta { font-size: 0.75rem; color: #9CA3AF; margin-top: 3em; border-top: 1px solid #F3F4F6; padding-top: 1em; }
    footer { font-size: 0.7rem; color: #D1D5DB; margin-top: 2em; }
  </style>
</head>
<body>
  <p class="upside">${esc(result.upside)}</p>
  <h1>${esc(result.headline) || 'Strategy Report'}</h1>
  <h2>Key Signal</h2>
  <p>${esc(result.signal)}</p>
  <h2>Your 3-Step Strategy</h2>
  ${(result.actions || []).map((a: any, i: number) => `
  <div class="action">
    <h3>${i + 1}. ${esc(a.title)}</h3>
    <p>${esc(a.what)}</p>
    <p><small>↗ ${esc(a.metric_impact)}</small></p>
  </div>`).join('')}
  <h2>Do This Week</h2>
  <p>${esc(result.thisWeek)}</p>
  <h2>Watch Out For</h2>
  <p>${esc(result.risk)}</p>
  <div class="meta">Generated ${esc(new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))} · Confidence ${Math.round(data.confidence * 100)}%</div>
  <footer>Starcoins Strategy AI</footer>
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `strategy-${id.slice(0, 8)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <main className="min-h-screen pb-28" style={{ background: '#F5F5F7' }}>
        <header className="flex items-center px-6 md:px-10 py-4 bg-card border-b border-border">
          <span className="font-heading font-bold text-sm text-ink">Starcoins</span>
        </header>
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-3">
          <div className="skeleton h-8 w-48 rounded mb-8" />
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
        <Dock />
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-28" style={{ background: '#F5F5F7' }}>

      {/* ── Top bar ─────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-card border-b border-border">
        <span className="font-heading font-bold text-sm text-ink">Starcoins</span>
        <Link href="/analyse"
          className="font-sans text-xs font-medium text-dim hover:text-ink transition-colors px-4 py-2 rounded-pill border border-border">
          ← New analysis
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 md:px-8 py-10">

        {/* Page heading */}
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-heading font-extrabold text-ink"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>
            Analysis History
          </h1>
          {analyses.length > 0 && (
            <span className="font-sans text-xs text-muted">
              {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'}
            </span>
          )}
        </div>

        {/* Error */}
        {fetchError && (
          <div className="font-sans text-xs px-4 py-3 rounded-card mb-6"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
            role="alert">
            {fetchError}
          </div>
        )}

        {/* Empty state */}
        {!fetchError && analyses.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="font-heading font-bold text-ink text-xl">No analyses yet.</p>
            <p className="font-sans text-sm text-muted">Your strategy history will appear here.</p>
            <Link href="/analyse"
              className="inline-flex items-center gap-2 font-heading font-bold text-ink text-sm px-6 py-3 rounded-pill glow-yellow transition-all"
              style={{ background: '#FACC15' }}>
              Run your first analysis →
            </Link>
          </div>
        )}

        {/* List */}
        {analyses.length > 0 && (
          <div className="space-y-2">
            {analyses.map((a) => {
              const style = INTENT_STYLE[a.intent] || { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' }
              return (
                <div key={a.id}
                  className="bg-card rounded-card border border-border overflow-hidden card-hover">

                  {/* Row */}
                  <button
                    onClick={() => handleExpand(a.id)}
                    className="w-full text-left px-5 py-4 grid grid-cols-12 gap-4 items-center transition-colors hover:bg-surface"
                    aria-expanded={expanded === a.id}>

                    {/* Intent badge */}
                    <div className="col-span-3 md:col-span-2">
                      <span className="inline-block font-sans text-xs font-medium px-2.5 py-1 rounded-pill capitalize"
                        style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                        {a.intent}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="col-span-7 md:col-span-8 min-w-0">
                      {a.headline ? (
                        <p className="font-heading font-semibold text-ink text-sm leading-snug truncate">
                          {a.headline}
                        </p>
                      ) : (
                        <p className="font-sans text-xs text-muted truncate">{a.input_preview}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-sans text-xs text-muted">
                          {new Date(a.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                        {a.headline && (
                          <span className="font-sans text-xs text-muted truncate hidden md:block">
                            {a.input_preview}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <ConfidenceBadge score={a.confidence} compact />
                      <span className="font-sans text-xs text-muted">
                        {expanded === a.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded */}
                  {expanded === a.id && (
                    <div className="border-t border-border px-5 py-6 animate-fade-up bg-surface">
                      {loadingId === a.id ? (
                        <div className="space-y-3">
                          <div className="skeleton h-3 w-full rounded" />
                          <div className="skeleton h-3 w-3/4 rounded" />
                          <div className="skeleton h-3 w-1/2 rounded" />
                        </div>
                      ) : fullData[a.id] ? (
                        <div className="space-y-6">
                          <StrategyResultView
                            result={fullData[a.id].result}
                            metrics={fullData[a.id].metrics || {}}
                            confidence={fullData[a.id].confidence}
                            pipelineSteps={fullData[a.id].pipeline_steps || []}
                          />
                          <div className="flex items-center gap-3 pt-4 border-t border-border">
                            <button
                              onClick={() => handleDownload(a.id)}
                              className="font-sans text-xs border border-border bg-card text-dim hover:text-ink px-4 py-2 rounded-pill transition-all">
                              Download report →
                            </button>
                            <span className="font-sans text-xs text-muted">
                              {fullData[a.id].cache_hit ? 'Cached result' : `${fullData[a.id].duration_ms}ms`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="font-sans text-xs text-muted">Failed to load full analysis.</p>
                          <button
                            onClick={() => {
                              setFullData((p) => { const n = { ...p }; delete n[a.id]; return n })
                              handleExpand(a.id)
                            }}
                            className="font-sans text-xs text-ink underline">
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dock />
    </main>
  )
}
