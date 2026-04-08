'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import { Nav }               from '@/components/Nav'
import { HelmButton }        from '@/components/HelmButton'
import { SailboatAnimation } from '@/components/SailboatAnimation'
import { AnswerCard }        from '@/components/AnswerCard'
import { DailyCounter }      from '@/components/DailyCounter'
import { PaywallModal }      from '@/components/PaywallModal'
import { useSailState }      from '@/hooks/useSailState'
import { useSubscription }   from '@/hooks/useSubscription'

const PLACEHOLDERS = [
  'I run a personal training business with 2,400 Instagram followers. My $120/session rate gets 1 DM a week…',
  'My Shopify store does $8k/month but cart abandonment is at 78%. Email list has 1,200 subscribers…',
  'B2B agency, 6 clients, $15k MRR. I need to double revenue in 90 days without hiring anyone…',
  'SaaS product, 340 free users, $0 paid conversions after 3 months. Charging $29/month…',
]

const MAX_CHARS = 2000

export default function ChatPage() {
  const [input, setInput]             = useState('')
  const [phIdx, setPhIdx]             = useState(0)
  const [isMac, setIsMac]             = useState(true)
  const textareaRef                   = useRef<HTMLTextAreaElement>(null)

  const { state, streamText, result, error, submit, reset } = useSailState()
  const {
    isPro, usedToday, canAnalyse,
    showPaywall, recordUsage, triggerPaywall, closePaywall, activatePro,
  } = useSubscription()

  // Detect platform for shortcut hint
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent))
  }, [])

  // Rotate placeholder every 4s
  useEffect(() => {
    const iv = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4000)
    return () => clearInterval(iv)
  }, [])

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`
  }, [input])

  // Activate Pro from Stripe redirect (?pro=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('pro') === '1') {
      activatePro()
      window.history.replaceState({}, '', '/chat')
    }
  }, [activatePro])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX_CHARS) setInput(e.target.value)
  }

  async function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed || state === 'THINKING' || state === 'STREAMING') return
    if (!canAnalyse) { triggerPaywall(); return }
    recordUsage()
    await submit(trimmed)
  }

  function handleReset() {
    reset()
    setInput('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const isActive   = state === 'THINKING' || state === 'STREAMING'
  const isComplete = state === 'COMPLETE'
  const charsLeft  = MAX_CHARS - input.length
  const charsWarn  = charsLeft < 200

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0A0F1E' }}>
      <Nav />

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Boat + counter */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <SailboatAnimation state={state} />
          </div>
          <div className="flex-shrink-0 pb-2">
            <DailyCounter used={usedToday} isPro={isPro} />
          </div>
        </div>

        {/* Status label */}
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.p
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-medium text-center tracking-widest uppercase"
              style={{ color: '#94A3B8' }}
            >
              {state === 'THINKING' ? 'Charting your course…' : 'Reading the wind…'}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Input */}
        <AnimatePresence mode="wait">
          {!isComplete && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-card overflow-hidden"
              style={{
                background:  '#111827',
                border:      `1px solid ${isActive ? 'rgba(192,57,43,0.3)' : 'rgba(255,255,255,0.08)'}`,
                transition:  'border-color 0.3s',
                boxShadow:   isActive ? '0 0 24px rgba(192,57,43,0.08)' : 'none',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder={PLACEHOLDERS[phIdx]}
                disabled={isActive}
                rows={4}
                className="w-full p-5 text-sm leading-relaxed bg-transparent disabled:opacity-40"
                style={{ color: '#F1F5F9', caretColor: '#C0392B' }}
              />

              <div
                className="flex items-center justify-between px-5 py-3 gap-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs hidden sm:block" style={{ color: '#94A3B8' }}>
                    {isMac ? '⌘' : 'Ctrl'} + Enter
                  </span>
                  {input.length > 0 && (
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: charsWarn ? '#FCD34D' : '#94A3B8' }}
                    >
                      {charsLeft}
                    </span>
                  )}
                </div>
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
              className="rounded-card p-4 flex items-start gap-3"
              style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)' }}
            >
              <span style={{ color: '#C0392B', fontSize: '1rem', lineHeight: 1.4 }}>⚠</span>
              <p className="text-sm leading-relaxed" style={{ color: '#FDA4AF' }}>
                {error === 'RATE_LIMIT'
                  ? 'Too many requests. Give it a minute, then try again.'
                  : error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {(state === 'STREAMING' || isComplete) && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <AnswerCard
                result={result}
                streamText={streamText}
                isStreaming={state === 'STREAMING'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* New analysis */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-center pb-8"
            >
              <button
                onClick={handleReset}
                className="flex items-center gap-2.5 px-6 py-3 rounded-pill text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.25)' }}
              >
                <HelmSVG size={14} /> New analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaywallModal open={showPaywall} onClose={closePaywall} />
    </main>
  )
}

function HelmSVG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5"  stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5"  stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="2.5"  x2="12" y2="9.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="14.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5"  y1="12" x2="9.5"  y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
