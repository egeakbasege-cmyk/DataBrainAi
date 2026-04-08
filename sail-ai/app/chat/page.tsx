'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav }               from '@/components/Nav'
import { HelmButton }        from '@/components/HelmButton'
import { SailboatAnimation } from '@/components/SailboatAnimation'
import { AnswerCard }        from '@/components/AnswerCard'
import { DailyCounter }      from '@/components/DailyCounter'
import { PaywallModal }      from '@/components/PaywallModal'
import { useSailState }      from '@/hooks/useSailState'
import { useSubscription }   from '@/hooks/useSubscription'

const PLACEHOLDERS = [
  'I run a personal training business with 2,400 Instagram followers. My $120/session rate gets maybe 1 DM a week…',
  'My Shopify store does $8k/month but cart abandonment is killing me. Email list is 1,200 people…',
  'B2B agency, 6 clients, $15k MRR. I need to double revenue in 90 days without hiring…',
  'SaaS product, 340 free users, $0 paid conversions after 3 months of trying…',
]

export default function ChatPage() {
  const [input, setInput]   = useState('')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const textareaRef          = useRef<HTMLTextAreaElement>(null)

  const { state, streamText, result, error, submit, reset } = useSailState()
  const { isPro, usedToday, canAnalyse, showPaywall, recordUsage, triggerPaywall, closePaywall, activatePro } = useSubscription()

  // Rotate placeholder
  useEffect(() => {
    let idx = 0
    const iv = setInterval(() => {
      idx = (idx + 1) % PLACEHOLDERS.length
      setPlaceholder(PLACEHOLDERS[idx])
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  // Pro activation from Stripe redirect (?pro=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('pro') === '1') {
        activatePro()
        window.history.replaceState({}, '', '/chat')
      }
    }
  }, [activatePro])

  async function handleSubmit() {
    if (!input.trim()) return
    if (state === 'THINKING' || state === 'STREAMING') return

    if (!canAnalyse) {
      triggerPaywall()
      return
    }

    recordUsage()
    await submit(input)
  }

  function handleReset() {
    reset()
    setInput('')
    textareaRef.current?.focus()
  }

  const isActive   = state === 'THINKING' || state === 'STREAMING'
  const isComplete = state === 'COMPLETE'

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0A0F1E' }}>
      <Nav />

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">

        {/* Animation + counter row */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <SailboatAnimation state={state} />
          </div>
          <div className="flex-shrink-0 pb-2">
            <DailyCounter used={usedToday} isPro={isPro} />
          </div>
        </div>

        {/* Input area */}
        <AnimatePresence mode="wait">
          {!isComplete && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-card overflow-hidden"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder={placeholder}
                disabled={isActive}
                rows={4}
                className="w-full p-5 text-sm leading-relaxed bg-transparent disabled:opacity-50"
                style={{ color: '#F1F5F9', caretColor: '#C0392B' }}
              />
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-xs" style={{ color: '#94A3B8' }}>
                  ⌘ + Enter to submit
                </span>
                <HelmButton
                  state={state}
                  onClick={handleSubmit}
                  disabled={isActive || !input.trim()}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-card p-4 text-sm"
              style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', color: '#FDA4AF' }}
            >
              {error === 'RATE_LIMIT'
                ? 'Rate limit reached. Please wait a moment.'
                : error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming / Result card */}
        <AnimatePresence>
          {(state === 'STREAMING' || isComplete) && (
            <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnswerCard
                result={result!}
                streamText={streamText}
                isStreaming={state === 'STREAMING'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset / New analysis */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-pill text-sm font-medium transition-all"
                style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.25)' }}
              >
                <HelmIcon /> New analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaywallModal open={showPaywall} onClose={closePaywall} />
    </main>
  )
}

function HelmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="2.5"  x2="12" y2="9.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="14.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5"  y1="12" x2="9.5"  y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
