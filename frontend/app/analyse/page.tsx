'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStrategyStream } from '../../lib/useStrategyStream'
import { ProgressBar } from '../../components/ProgressBar'
import { StrategyResultView } from '../../components/StrategyResult'
import { PaywallModal } from '../../components/PaywallModal'
import { CreditPanel } from '../../components/CreditPanel'

const QUICK_PICKS = [
  'How do I get my first 10 paying customers?',
  'Where am I losing money?',
  'What should I focus on this month?',
  'How do I raise prices without losing clients?',
  'What is my fastest path to $10k/month?',
  'How do I reduce churn?',
]

const MIN_CHARS = 10
const MAX_CHARS = 1200

export default function AnalysePage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [input,       setInput]       = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [credits,     setCredits]     = useState<number | null>(null)
  const [freeUsed,    setFreeUsed]    = useState(false)

  const { analyse, reset, progress, currentStep, result, confidence, error, status } =
    useStrategyStream()

  // ── Sync credits & freeUsed from session ─────────────────────────
  useEffect(() => {
    if (session) {
      setCredits((session as any).credits  ?? null)
      setFreeUsed((session as any).freeUsed ?? false)
    }
  }, [session])

  // ── Redirect unauthenticated only after status resolves ──────────
  // (we allow the free analysis flow without auth first)

  // ── Derived state ─────────────────────────────────────────────────
  const charCount   = input.trim().length
  const canAnalyse  = charCount >= MIN_CHARS
  const isStreaming = status === 'streaming'
  const isComplete  = status === 'complete'

  const getCtaLabel = () => {
    if (!canAnalyse)                         return 'Describe your challenge to begin'
    if (!freeUsed)                           return '✦ Analyse — completely free'
    if (credits !== null && credits > 0)     return `Analyse  ·  1 credit`
    return 'Buy credits to continue →'
  }

  const getCtaStyle = (): React.CSSProperties => {
    if (!canAnalyse)    return { background: 'var(--border)',  color: 'var(--muted)',   cursor: 'not-allowed' }
    if (!freeUsed)      return { background: 'var(--green)',   color: 'var(--bg)' }
    if (credits && credits > 0) return { background: 'var(--accent)', color: 'var(--bg)' }
    return { background: 'var(--warning)', color: 'var(--bg)' }
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

    const token = (session as any)?.accessToken || ''
    await analyse(input.trim(), token)

    // Deduct from local state immediately for snappy UI
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

  // ── Session loading skeleton ──────────────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="space-y-2 w-64">
          <div className="skeleton h-2 rounded-full" />
          <div className="skeleton h-2 rounded-full w-3/4" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4"
        style={{ background: 'rgba(7,8,14,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/" className="font-mono text-xs text-muted uppercase tracking-widest-2 hover:text-ink transition-colors">
          ← Starcoins
        </Link>
        <CreditPanel credits={credits} freeUsed={freeUsed} onBuy={() => setShowPaywall(true)} />
      </header>

      <div className="max-w-2xl mx-auto px-6 md:px-8 py-12 md:py-16">

        {/* ── Input view ──────────────────────────────────── */}
        {!isComplete && (
          <div className="space-y-8 animate-fade-up">

            {/* Page heading */}
            <div className="space-y-3">
              {!freeUsed && (
                <div className="flex items-center gap-2 mb-4">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                  <span className="font-mono text-2xs text-green uppercase tracking-widest">
                    First analysis completely free
                  </span>
                </div>
              )}
              <h1 className="font-heading text-ink"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: '1.1', letterSpacing: '-0.02em' }}>
                What is your business challenge?
              </h1>
              <p className="font-sans text-dim text-sm" style={{ fontWeight: 300 }}>
                Be specific — revenue model, audience size, current metrics. The more detail, the sharper the strategy.
              </p>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
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
                className="w-full px-5 py-4 rounded-card text-ink text-sm leading-relaxed resize-none disabled:opacity-50 transition-opacity"
                style={{ minHeight: 160 }}
              />
              <div id="char-count" className="flex items-center justify-between">
                <span className="font-mono text-2xs text-muted">
                  {charCount < MIN_CHARS
                    ? `${MIN_CHARS - charCount} more characters needed`
                    : `${charCount} / ${MAX_CHARS}`}
                </span>
                {charCount > 0 && charCount < MIN_CHARS && (
                  <span className="font-mono text-2xs" style={{ color: 'var(--warning)' }}>
                    Too short
                  </span>
                )}
              </div>
            </div>

            {/* Quick picks */}
            <div className="space-y-2">
              <p className="font-mono text-2xs text-muted uppercase tracking-widest">
                Quick starts
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PICKS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus() }}
                    disabled={isStreaming}
                    className="font-mono text-xs px-3 py-1.5 rounded-pill border transition-all disabled:opacity-40"
                    style={{
                      borderColor: 'var(--border)',
                      color:       'var(--dim)',
                      background:  'transparent',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'rgba(255,255,255,0.18)'
                      el.style.color       = 'var(--ink)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--border)'
                      el.style.color       = 'var(--dim)'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar — shown while streaming */}
            {isStreaming && (
              <div className="animate-fade-in space-y-2 py-2">
                <ProgressBar progress={progress} currentStep={currentStep} status={status} />
              </div>
            )}

            {/* Error */}
            {error && status === 'error' && (
              <div className="font-mono text-xs px-4 py-3 rounded-card"
                style={{
                  background: 'rgba(201,79,79,0.07)',
                  border:     '1px solid rgba(201,79,79,0.22)',
                  color:      'var(--danger)',
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
              className="w-full font-mono text-sm font-medium py-4 rounded-pill transition-all"
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

        {/* ── Result view ─────────────────────────────────── */}
        {isComplete && result && (
          <div className="animate-fade-up space-y-8">

            {/* Progress summary */}
            <div className="pb-6 border-b border-border">
              <ProgressBar progress={100} currentStep="cache_written" status="complete" />
            </div>

            <StrategyResultView
              result={result}
              metrics={result.metrics || {}}
              confidence={confidence || 0}
              pipelineSteps={result.pipeline_steps || []}
            />

            {/* Actions row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowPaywall(true)}
                className="flex-1 font-mono text-sm font-medium py-3.5 rounded-pill transition-all"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                Buy 3 analyses — $9
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3.5 border border-border text-dim hover:text-ink font-mono text-sm rounded-pill transition-all"
              >
                ← New question
              </button>
              <Link
                href="/history"
                className="px-6 py-3.5 border border-border text-dim hover:text-ink font-mono text-sm rounded-pill transition-all text-center"
              >
                History
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Paywall modal ────────────────────────────────── */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onSuccess={handleCreditsAdded}
        />
      )}
    </main>
  )
}
