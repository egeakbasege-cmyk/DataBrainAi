'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getAnalyses, getAnalysis } from '../../lib/api'
import { StrategyResultView } from '../../components/StrategyResult'
import { ConfidenceBadge } from '../../components/ConfidenceBadge'

interface AnalysisSummary {
  id: string
  created_at: string
  input_preview: string
  headline: string
  confidence: number
  intent: string
}

interface FullAnalysis {
  id: string
  created_at: string
  input: string
  intent: string
  confidence: number
  metrics: Record<string, any>
  result: any
  pipeline_steps: any[]
  duration_ms: number
  cache_hit: boolean
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fullData, setFullData] = useState<Record<string, FullAnalysis>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/history')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const token = (session as any)?.accessToken || ''
    getAnalyses(token)
      .then((data) => setAnalyses(data.analyses || []))
      .finally(() => setLoading(false))
  }, [status, session])

  const handleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!fullData[id]) {
      const token = (session as any)?.accessToken || ''
      const data = await getAnalysis(id, token)
      setFullData((prev) => ({ ...prev, [id]: data }))
    }
  }

  const handleDownload = (id: string) => {
    const data = fullData[id]
    if (!data) return
    const html = `
      <html><head><title>Strategy Report</title></head><body>
      <h1>${data.result?.headline || 'Strategy Report'}</h1>
      <h2>Key Insight</h2><p>${data.result?.signal || ''}</p>
      <h2>Actions</h2>
      ${(data.result?.actions || []).map((a: any) => `<h3>${a.title}</h3><p>${a.what}</p>`).join('')}
      <h2>This Week</h2><p>${data.result?.thisWeek || ''}</p>
      <h2>Risk</h2><p>${data.result?.risk || ''}</p>
      </body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `strategy-${id.slice(0, 8)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const intentColor: Record<string, string> = {
    growth: '#2de8a0',
    monetisation: '#f0c840',
    retention: '#2bc4e8',
    pricing: '#e09030',
    acquisition: '#a78bfa',
    cost_reduction: '#e06060',
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted font-mono text-sm animate-pulse">Loading history…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-heading text-xl text-white">Starcoins</span>
        <a href="/analyse" className="text-sm text-accent hover:underline font-mono">
          ← New analysis
        </a>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-heading text-3xl text-white mb-8">Analysis History</h1>

        {analyses.length === 0 ? (
          <div className="text-center py-20 text-muted font-mono">
            <p>No analyses yet.</p>
            <a href="/analyse" className="text-accent hover:underline mt-2 inline-block">
              Run your first analysis →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-card overflow-hidden">
                <button
                  onClick={() => handleExpand(a.id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded-chip"
                        style={{
                          background: (intentColor[a.intent] || '#4a6080') + '20',
                          color: intentColor[a.intent] || '#4a6080',
                        }}
                      >
                        {a.intent}
                      </span>
                      <span className="text-xs text-muted font-mono">
                        {new Date(a.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted font-mono truncate">{a.input_preview}</p>
                    {a.headline && (
                      <p className="text-white text-sm mt-1 font-heading">{a.headline}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ConfidenceBadge score={a.confidence} compact />
                    <span className="text-muted text-xs">{expanded === a.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded === a.id && (
                  <div className="border-t border-border px-5 py-5 animate-fade-up">
                    {fullData[a.id] ? (
                      <>
                        <StrategyResultView
                          result={fullData[a.id].result}
                          metrics={fullData[a.id].metrics || {}}
                          confidence={fullData[a.id].confidence}
                          pipelineSteps={fullData[a.id].pipeline_steps || []}
                        />
                        <button
                          onClick={() => handleDownload(a.id)}
                          className="mt-4 text-xs border border-border text-muted hover:text-white px-4 py-2 rounded-chip font-mono transition-all"
                        >
                          Download report →
                        </button>
                      </>
                    ) : (
                      <p className="text-muted font-mono text-sm animate-pulse">Loading…</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
