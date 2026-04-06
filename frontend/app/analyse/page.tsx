'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { useStrategyStream } from '../../lib/useStrategyStream'
import { ProgressBar } from '../../components/ProgressBar'
import { StrategyResultView } from '../../components/StrategyResult'
import { PaywallModal } from '../../components/PaywallModal'
import { CreditPanel } from '../../components/CreditPanel'
import { Dock } from '../../components/Dock'
import FeedbackForm from '../../components/FeedbackForm'
import { ModeSelector } from '../../components/ModeSelector'
import { ScenarioCards } from '../../components/ScenarioCards'
import { useAppMode, MODE_META } from '../../context/AppModeContext'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const MIN_CHARS = 10
const MAX_CHARS = 1200
const MAX_CSV_ROWS = 200

export default function AnalysePage() {
  const { data: session, status: sessionStatus } = useSession()
  const { mode } = useAppMode()
  const router       = useRouter()
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [input,        setInput]        = useState('')
  const [showPaywall,  setShowPaywall]  = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [credits,      setCredits]      = useState<number | null>(null)
  const [freeUsed,     setFreeUsed]     = useState(false)
  const [csvContext,   setCsvContext]   = useState<string | null>(null)
  const [csvName,      setCsvName]      = useState<string | null>(null)

  const { analyse, reset, progress, currentStep, result, confidence, error, status } =
    useStrategyStream()

  useEffect(() => {
    if (session) {
      setCredits((session as any).credits  ?? null)
      setFreeUsed((session as any).freeUsed ?? false)
    }
  }, [session])

  const charCount   = input.trim().length
  const canAnalyse  = charCount >= MIN_CHARS
  const isStreaming = status === 'streaming'
  const isComplete  = status === 'complete'

  const getCtaLabel = () => {
    if (!canAnalyse)                     return 'Describe your challenge to begin'
    if (!freeUsed)                       return 'Analyse — completely free ✦'
    if (credits !== null && credits > 0) return `Analyse  ·  1 credit`
    return 'Buy credits to continue →'
  }

  const getCtaStyle = (): React.CSSProperties => {
    if (!canAnalyse)               return { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
    if (!freeUsed)                 return { background: '#FACC15', color: '#111827' }
    if (credits && credits > 0)    return { background: '#111827', color: '#FFFFFF' }
    return                                { background: '#F59E0B', color: '#FFFFFF' }
  }

  const handleSubmit = async () => {
    if (!canAnalyse || isStreaming) return

    if (freeUsed && (!credits || credits < 1)) {
      setShowPaywall(true)
      return
    }

    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/analyse')
      return
    }

    const token        = (session as any)?.accessToken || ''
    const systemPrompt = MODE_META[mode].systemPrompt
    const fullPrompt   = csvContext
      ? `[DATA CONTEXT]\n${csvContext}\n\n[USER QUESTION]\n${input.trim()}`
      : input.trim()

    await analyse(fullPrompt, token, systemPrompt)

    if (freeUsed && credits && credits > 0) {
      setCredits((c) => (c !== null ? c - 1 : c))
    } else if (!freeUsed) {
      setFreeUsed(true)
    }
  }

  const handleReset = () => {
    reset()
    setInput('')
    textareaRef.current?.focus()
  }

  const handleCreditsAdded = (n: number) => {
    setCredits((c) => (c ?? 0) + n)
    setShowPaywall(false)
  }

  const handleScenarioSelect = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header:         true,
      skipEmptyLines: true,
      preview:        MAX_CSV_ROWS,
      complete: (results) => {
        const rows   = results.data as Record<string, string>[]
        const fields = results.meta.fields ?? []
        const lines  = rows.map((r) =>
          fields.map((f) => `${f}: ${r[f] ?? ''}`).join(' | ')
        )
        const summary =
          `CSV: ${file.name} (${rows.length} rows, columns: ${fields.join(', ')})\n\n` +
          lines.slice(0, MAX_CSV_ROWS).join('\n')
        setCsvContext(summary)
        setCsvName(file.name)
      },
    })
    e.target.value = ''
  }

  const handleRemoveCsv = () => {
    setCsvContext(null)
    setCsvName(null)
  }

  if (sessionStatus === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F7' }}>
        <div className="space-y-2 w-52">
          <div className="skeleton h-2 rounded-full" />
          <div className="skeleton h-2 rounded-full w-3/4" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-28" style={{ background: '#F5F5F7' }}>

      {/* ── Top bar ─────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-card border-b border-border">
        <Link href="/"
          className="font-heading font-bold text-sm text-ink hover:opacity-70 transition-opacity">
          Starcoins
        </Link>
        <CreditPanel credits={credits} freeUsed={freeUsed} onBuy={() => setShowPaywall(true)} />
      </header>

      <div className="max-w-2xl mx-auto px-6 md:px-8 py-10 md:py-14">

        {/* ── Input view ────────────────────────────── */}
        {!isComplete && (
          <div className="space-y-6 animate-fade-up">

            {/* Heading + Mode selector */}
            <div className="space-y-4">
              {!freeUsed && (
                <div className="flex items-center gap-2">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FACC15', display: 'inline-block', boxShadow: '0 0 6px rgba(250,204,21,0.5)' }} />
                  <span className="font-sans text-xs font-medium uppercase tracking-widest-2"
                    style={{ color: '#92400E' }}>
                    First analysis completely free
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="font-heading font-extrabold text-ink"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.03em' }}>
                  What's your challenge?
                </h1>
                <ModeSelector />
              </div>
              <p className="font-sans text-sm text-dim">
                {MODE_META[mode].hint} — be specific for sharper output.
              </p>
            </div>

            {/* Scenario cards (zero state) */}
            {!input && !isStreaming && (
              <ScenarioCards onSelect={handleScenarioSelect} />
            )}

            {/* Textarea card */}
            <div className="bg-card rounded-card border border-border p-1"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <textarea
                ref={textareaRef}
                id="challenge-input"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                rows={7}
                disabled={isStreaming}
                aria-label="Describe your business challenge"
                aria-describedby="char-count"
                placeholder={`Example: I'm a personal trainer with 4,000 TikTok followers and 2 paying clients at £75/session. How do I convert more followers into paying clients in the next 90 days?`}
                className="w-full px-4 py-4 text-ink text-sm leading-relaxed resize-none disabled:opacity-50 transition-opacity"
                style={{
                  background:   'transparent',
                  border:       'none',
                  borderRadius: '14px',
                  minHeight:    160,
                  outline:      'none',
                  boxShadow:    'none',
                }}
              />
              <div id="char-count" className="flex items-center justify-between px-4 pb-3">
                <span className="font-sans text-xs text-muted">
                  {charCount < MIN_CHARS && charCount > 0
                    ? `${MIN_CHARS - charCount} more characters needed`
                    : charCount > 0
                    ? `${charCount} / ${MAX_CHARS}`
                    : ''}
                </span>
                {charCount > 0 && charCount < MIN_CHARS && (
                  <span className="font-sans text-xs" style={{ color: '#F59E0B' }}>Too short</span>
                )}
              </div>
            </div>

            {/* CSV upload row */}
            <div className="flex items-center gap-3 flex-wrap">
              {csvContext ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill"
                  style={{
                    background: 'rgba(250,204,21,0.10)',
                    border:     '1px solid rgba(250,204,21,0.35)',
                  }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FACC15', display: 'inline-block' }} />
                  <span className="font-sans text-xs font-medium" style={{ color: '#92400E' }}>
                    Data Context Active — {csvName}
                  </span>
                  <button
                    onClick={handleRemoveCsv}
                    className="font-sans text-xs ml-1 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: '#92400E' }}
                    aria-label="Remove CSV data context"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                    aria-label="Upload CSV data file"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming}
                    className="flex items-center gap-1.5 font-sans text-xs px-3.5 py-2 rounded-pill border transition-all disabled:opacity-40"
                    style={{ borderColor: '#E5E7EB', color: '#6B7280', background: '#FFFFFF' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB'
                      e.currentTarget.style.color       = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.color       = '#6B7280'
                    }}
                  >
                    <span>📎</span>
                    <span>Upload CSV data</span>
                  </button>
                  <span className="font-sans text-xs text-muted">
                    Attach financials or metrics for deeper analysis
                  </span>
                </>
              )}
            </div>

            {/* Progress bar (streaming) */}
            {isStreaming && (
              <div className="animate-fade-in bg-card rounded-card border border-border p-5">
                <ProgressBar progress={progress} currentStep={currentStep} status={status} />
              </div>
            )}

            {/* Error */}
            {error && status === 'error' && (
              <div className="font-sans text-xs px-4 py-3 rounded-card"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border:     '1px solid rgba(239,68,68,0.2)',
                  color:      '#DC2626',
                }}
                role="alert"
                aria-live="assertive">
                {error}
                <button onClick={reset} className="ml-3 underline opacity-70 hover:opacity-100">
                  Try again
                </button>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={!canAnalyse || isStreaming}
              className="w-full font-heading font-bold text-sm py-4 rounded-pill transition-all"
              style={getCtaStyle()}
              aria-busy={isStreaming}
            >
              {isStreaming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-pulse">●</span>
                  Analysing your business…
                </span>
              ) : getCtaLabel()}
            </button>
          </div>
        )}

        {/* ── Result view ──────────────────────────── */}
        {isComplete && result && (
          <div className="animate-fade-up space-y-6">

            {/* Progress summary */}
            <div className="bg-card rounded-card border border-border p-5">
              <ProgressBar progress={100} currentStep="cache_written" status="complete" />
            </div>

            {/* Mode used badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FACC15', display: 'inline-block' }} />
              <span className="font-sans text-xs font-medium uppercase tracking-widest-2"
                style={{ color: '#92400E' }}>
                {MODE_META[mode].label} mode
              </span>
              {csvName && (
                <>
                  <span className="font-sans text-xs text-muted">·</span>
                  <span className="font-sans text-xs text-muted">📎 {csvName}</span>
                </>
              )}
            </div>

            <StrategyResultView
              result={result}
              metrics={result.metrics || {}}
              confidence={confidence || 0}
              pipelineSteps={result.pipeline_steps || []}
            />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => setShowPaywall(true)}
                className="flex-1 font-heading font-bold text-ink text-sm py-3.5 rounded-pill transition-all glow-yellow"
                style={{ background: '#FACC15' }}>
                Buy 3 analyses — $9
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3.5 border border-border bg-card text-dim hover:text-ink font-sans text-sm rounded-pill transition-all">
                ← New question
              </button>
              <Link
                href="/history"
                className="px-6 py-3.5 border border-border bg-card text-dim hover:text-ink font-sans text-sm rounded-pill transition-all text-center">
                History
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Paywall modal ───────────────────────────── */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onSuccess={handleCreditsAdded}
        />
      )}

      {/* ── Feedback button + modal ──────────────────── */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed right-5 bottom-24 z-40 font-sans text-xs font-medium px-3.5 py-2 rounded-pill transition-all no-print"
        style={{
          background:           'rgba(255,255,255,0.6)',
          backdropFilter:       'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border:               '1px solid rgba(229,231,235,0.9)',
          boxShadow:            '0 2px 12px rgba(0,0,0,0.06)',
          color:                '#64748B',
        }}
        aria-label="Give feedback"
      >
        Feedback
      </button>

      <AnimatePresence>
        {showFeedback && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowFeedback(false) }}
          >
            <FeedbackForm onClose={() => setShowFeedback(false)} />
          </div>
        )}
      </AnimatePresence>

      <Dock />
    </main>
  )
}
