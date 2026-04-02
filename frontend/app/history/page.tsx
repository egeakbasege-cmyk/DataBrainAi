'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAnalyses, getAnalysis } from '../../lib/api'
import { StrategyResultView } from '../../components/StrategyResult'
import { ConfidenceBadge } from '../../components/ConfidenceBadge'

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

const INTENT_COLORS: Record<string, string> = {
  growth:         '#1ed48a',
  monetisation:   '#e8bb28',
  retention:      '#18b8e0',
  pricing:        '#d4821e',
  acquisition:    '#a78bfa',
  cost_reduction: '#c94f4f',
}

function SkeletonRow() {
  return (
    <div className="rounded-card border border-border px-5 py-5 space-y-3 overflow-hidden">
      <div className="flex items-center gap-2">
        <div className="skeleton h-4 w-16 rounded-chip" />
        <div className="skeleton h-3 w-24 rounded-chip" />
      </div>
      <div className="skeleton h-3 w-full rounded-chip" />
      <div className="skeleton h-4 w-3/4 rounded-chip" />
    </div>
  )
}

export default function HistoryPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [analyses,  setAnalyses]  = useState<AnalysisSummary[]>([])
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [fullData,  setFullData]  = useState<Record<string, FullAnalysis>>({})
  const [loading,   setLoading]   = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
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
    body { font-family: Georgia, serif; max-width: 680px; margin: 60px auto; padding: 0 24px; color: #111; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 0.25em; }
    h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2.5em; color: #555; border-bottom: 1px solid #eee; padding-bottom: 0.5em; }
    p { margin: 0.75em 0; }
    .upside { display: inline-block; padding: 2px 12px; background: #fef9e7; border: 1px solid #f0d060; border-radius: 999px; font-size: 0.8rem; font-family: monospace; color: #a07800; margin-bottom: 1em; }
    .action { margin: 1.5em 0; padding: 1em 1.25em; border-left: 3px solid #0ea5e9; background: #f0f9ff; }
    .action h3 { margin: 0 0 0.5em; font-size: 1rem; }
    .meta { font-family: monospace; font-size: 0.75rem; color: #888; margin-top: 3em; border-top: 1px solid #eee; padding-top: 1em; }
    footer { font-family: monospace; font-size: 0.7rem; color: #aaa; margin-top: 3em; }
  </style>
</head>
<body>
  <p class="upside">${result.upside || ''}</p>
  <h1>${result.headline || 'Strategy Report'}</h1>
  <h2>Key Signal</h2>
  <p>${result.signal || ''}</p>
  <h2>Your 3-Step Strategy</h2>
  ${(result.actions || []).map((a: any, i: number) => `
  <div class="action">
    <h3>${i + 1}. ${a.title}</h3>
    <p>${a.what}</p>
    <p><small>↗ ${a.metric_impact}</small></p>
  </div>`).join('')}
  <h2>Do This Week</h2>
  <p>${result.thisWeek || ''}</p>
  <h2>Watch Out For</h2>
  <p>${result.risk || ''}</p>
  <div class="meta">Generated ${new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Confidence ${Math.round(data.confidence * 100)}%</div>
  <footer>Starcoins Strategy AI · Powered by Claude</footer>
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

  // ── Loading ───────────────────────────────────────────────────────
  if (loading || sessionStatus === 'loading') {
    return (
      <main className="min-h-screen bg-bg">
        <header className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-border">
          <span className="font-mono text-xs text-muted uppercase tracking-widest-2">Starcoins</span>
        </header>
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-3">
          <div className="skeleton h-8 w-48 rounded-card mb-8" />
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4"
        style={{ background: 'rgba(7,8,14,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/analyse"
          className="font-mono text-xs text-muted uppercase tracking-widest-2 hover:text-ink transition-colors">
          ← New analysis
        </Link>
        <Link href="/"
          className="font-mono text-xs text-muted uppercase tracking-widest-2 hover:text-ink transition-colors">
          Starcoins
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">

        {/* Page heading */}
        <div className="flex items-baseline justify-between mb-10">
          <h1 className="font-heading text-ink"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', letterSpacing: '-0.02em' }}>
            Analysis History
          </h1>
          {analyses.length > 0 && (
            <span className="font-mono text-2xs text-muted">
              {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'}
            </span>
          )}
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="font-mono text-xs px-4 py-3 rounded-card mb-6"
            style={{ background: 'rgba(201,79,79,0.07)', border: '1px solid rgba(201,79,79,0.22)', color: 'var(--danger)' }}
            role="alert">
            {fetchError}
          </div>
        )}

        {/* Empty state */}
        {!fetchError && analyses.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <p className="font-heading text-dim" style={{ fontSize: '1.5rem' }}>
              No analyses yet.
            </p>
            <p className="font-mono text-2xs text-muted">Your strategy history will appear here.</p>
            <Link href="/analyse"
              className="inline-flex items-center gap-2 font-mono text-xs text-green border border-green/30 px-6 py-2.5 rounded-pill hover:bg-green/8 transition-all mt-4">
              Run your first analysis →
            </Link>
          </div>
        )}

        {/* List */}
        {analyses.length > 0 && (
          <div className="space-y-2">
            {analyses.map((a) => {
              const color = INTENT_COLORS[a.intent] || 'var(--muted)'
              return (
                <div key={a.id}
                  className="rounded-card overflow-hidden card-hover"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

                  {/* Row header */}
                  <button
                    onClick={() => handleExpand(a.id)}
                    className="w-full text-left px-5 py-4 grid grid-cols-12 gap-4 items-center transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    aria-expanded={expanded === a.id}
                  >
                    {/* Intent badge */}
                    <div className="col-span-2 md:col-span-1">
                      <span className="font-mono text-2xs px-2 py-1 rounded-chip capitalize"
                        style={{ background: color + '14', color, border: `1px solid ${color}28` }}>
                        {a.intent}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="col-span-8 md:col-span-9 min-w-0">
                      {a.headline ? (
                        <p className="font-heading text-ink text-base leading-snug truncate">
                          {a.headline}
                        </p>
                      ) : (
                        <p className="font-mono text-2xs text-muted truncate">{a.input_preview}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-2xs text-muted">
                          {new Date(a.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                        {a.headline && (
                          <span className="font-mono text-2xs text-muted truncate hidden md:block">
                            {a.input_preview}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <ConfidenceBadge score={a.confidence} compact />
                      <span className="font-mono text-2xs text-muted">
                        {expanded === a.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expanded === a.id && (
                    <div className="border-t border-border px-5 py-6 animate-fade-up">
                      {loadingId === a.id ? (
                        <div className="space-y-3">
                          <div className="skeleton h-3 w-full rounded-chip" />
                          <div className="skeleton h-3 w-3/4 rounded-chip" />
                          <div className="skeleton h-3 w-1/2 rounded-chip" />
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
                              className="font-mono text-2xs border border-border text-dim hover:text-ink px-4 py-2 rounded-pill transition-all"
                            >
                              Download report →
                            </button>
                            <span className="font-mono text-2xs text-muted">
                              {fullData[a.id].cache_hit ? 'Cached result' : `${fullData[a.id].duration_ms}ms`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="font-mono text-2xs text-muted">Failed to load full analysis.</p>
                          <button
                            onClick={() => { setFullData((p) => { const n = { ...p }; delete n[a.id]; return n }); handleExpand(a.id) }}
                            className="font-mono text-2xs text-accent underline">
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
    </main>
  )
}
