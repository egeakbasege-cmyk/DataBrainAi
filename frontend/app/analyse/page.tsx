'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useStrategyStream } from '../../lib/useStrategyStream'
import { ProgressBar } from '../../components/ProgressBar'
import { StrategyResultView } from '../../components/StrategyResult'
import { PaywallModal } from '../../components/PaywallModal'
import { CreditPanel } from '../../components/CreditPanel'

const QUICK_PICKS = [
  'How do I get more customers?',
  'Where am I losing money?',
  'What should I focus on this month?',
  'How do I raise my prices without losing clients?',
  'What is my fastest path to $10k/month?',
]

export default function AnalysePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [freeUsed, setFreeUsed] = useState<boolean>(false)

  const { analyse, progress, currentStep, result, confidence, error, status } =
    useStrategyStream()

  const canAnalyse = input.trim().length > 10

  const ctaLabel = () => {
    if (!input.trim()) return 'Enter your situation →'
    if (!freeUsed) return '✦ Analyse for free →'
    if (credits && credits > 0) return 'Analyse — 1 credit ($3) →'
    return 'Buy credits to continue →'
  }

  const ctaClass = () => {
    const base = 'w-full py-3.5 rounded-pill font-medium transition-all text-sm'
    if (!canAnalyse) return `${base} bg-border text-muted cursor-not-allowed`
    if (!freeUsed) return `${base} bg-green text-bg hover:shadow-green`
    if (credits && credits > 0) return `${base} bg-accent text-bg hover:shadow-accent`
    return `${base} bg-warning text-bg hover:opacity-90`
  }

  const handleSubmit = async () => {
    if (!canAnalyse) return
    if (freeUsed && (!credits || credits < 1)) {
      setShowPaywall(true)
      return
    }
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }
    const token = (session as any).accessToken || ''
    await analyse(input, token)
  }

  const handleQuickPick = (q: string) => setInput(q)

  return (
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-heading text-xl text-white">Starcoins</span>
        <CreditPanel credits={credits} freeUsed={freeUsed} onBuy={() => setShowPaywall(true)} />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Input section */}
        {status !== 'complete' && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              {!freeUsed && (
                <div className="inline-flex items-center gap-2 bg-green/10 border border-green/30 text-green text-xs px-3 py-1 rounded-pill font-mono mb-4">
                  ✦ First analysis completely free
                </div>
              )}
              <h1 className="font-heading text-3xl text-white">What is your business challenge?</h1>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              placeholder={`Describe your business and ask your question.\n\nExample: I am a personal trainer with 4,000 TikTok followers and only 2 paying clients at £75/session. How do I convert followers into clients?`}
              className="w-full bg-card border border-border rounded-card px-4 py-3 text-white placeholder:text-muted font-mono text-sm resize-none focus:outline-none focus:border-accent transition-colors"
            />

            {/* Quick picks */}
            <div className="flex flex-wrap gap-2">
              {QUICK_PICKS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickPick(q)}
                  className="text-xs bg-surface border border-border text-muted hover:text-white hover:border-accent px-3 py-1.5 rounded-chip transition-all font-sans"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* CTA */}
            <button onClick={handleSubmit} disabled={!canAnalyse} className={ctaClass()}>
              {ctaLabel()}
            </button>

            {/* Loading */}
            {status === 'streaming' && (
              <div className="mt-6 animate-fade-up">
                <ProgressBar progress={progress} currentStep={currentStep} status={status} />
              </div>
            )}

            {error && (
              <div className="mt-4 bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-card font-mono">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {status === 'complete' && result && (
          <div className="animate-fade-up">
            <StrategyResultView
              result={result}
              metrics={result.metrics || {}}
              confidence={confidence || 0}
              pipelineSteps={result.pipeline_steps || []}
            />
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowPaywall(true)}
                className="flex-1 bg-accent text-bg font-medium py-3 rounded-pill text-sm hover:shadow-accent transition-all"
              >
                Buy 3 credits — $9
              </button>
              <button
                onClick={() => {
                  setInput('')
                  // reset stream state via hook
                  window.location.reload()
                }}
                className="px-6 py-3 border border-border text-muted hover:text-white text-sm rounded-pill transition-all"
              >
                ← New question
              </button>
            </div>
          </div>
        )}
      </div>

      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} onSuccess={(n) => setCredits((c) => (c || 0) + n)} />
      )}
    </main>
  )
}
