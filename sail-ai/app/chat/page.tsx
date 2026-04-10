'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import { Nav }               from '@/components/Nav'
import { HelmButton }        from '@/components/HelmButton'
import { SailboatAnimation } from '@/components/SailboatAnimation'
import { AnswerCard }        from '@/components/AnswerCard'
import { DailyCounter }      from '@/components/DailyCounter'
import { PaywallModal }      from '@/components/PaywallModal'
import { FeedbackModal }     from '@/components/FeedbackModal'
import { WaveRule }          from '@/components/Ornaments'
import { useSailState }      from '@/hooks/useSailState'
import { useSubscription }   from '@/hooks/useSubscription'
import { useBusinessContext } from '@/lib/context/BusinessContext'

const PLACEHOLDERS = [
  'E-commerce store, £8k/month revenue, 1.5% conversion rate, 68% cart abandonment…',
  'B2B agency, 6 retainer clients, £18k MRR, need to stabilise pipeline…',
  'SaaS product, 340 free users, 4% monthly churn, no paid conversions yet…',
  'Personal training, 12 active clients, £95/session, want to increase throughput…',
]

const MAX           = 2000
const API_KEY_STORE = 'sail_gemini_key'

export default function ChatPage() {
  const [input,        setInput]        = useState('')
  const [phIdx,        setPhIdx]        = useState(0)
  const [isMac,        setIsMac]        = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const [apiKey,       setApiKey]       = useState('')
  const [apiKeyInput,  setApiKeyInput]  = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { state, streamText, result, error, submit, reset } = useSailState()
  const { isPro, usedToday, canAnalyse, showPaywall, recordUsage, triggerPaywall, closePaywall, activatePro } = useSubscription()
  const { buildContext, addSession, profile } = useBusinessContext()

  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent)) }, [])
  useEffect(() => {
    const iv = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4000)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`
  }, [input])

  // Load API key from localStorage + handle URL params
  useEffect(() => {
    try {
      const stored = localStorage.getItem(API_KEY_STORE) ?? ''
      setApiKey(stored)
      setApiKeyInput(stored)
    } catch { /* ignore */ }

    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      try { setInput(decodeURIComponent(q)) } catch { setInput(q) }
      window.history.replaceState({}, '', '/chat')
    }
    if (params.get('pro') === '1') {
      activatePro()
      window.history.replaceState({}, '', '/chat')
    }
  }, [activatePro])

  // Save completed strategies to session memory
  useEffect(() => {
    if (state === 'COMPLETE' && result && !('needsMetrics' in result)) {
      addSession(input, `${result.headline} — target: ${result.target30}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, result])

  // Show key panel on any AI failure that could be fixed with BYOK
  useEffect(() => {
    if (!error) return
    const isAiError = error.includes('quota') || error.includes('aistudio') ||
      error.includes('API key') || error.includes('Unable to reach') ||
      error.includes('AI_') || error.includes('exhausted') || error.includes('unavailable')
    if (isAiError) setShowKeyPanel(true)
  }, [error])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX) setInput(e.target.value)
  }

  async function handleSubmit() {
    const t = input.trim()
    if (!t || state === 'THINKING' || state === 'STREAMING') return
    if (!canAnalyse) { triggerPaywall(); return }
    recordUsage()
    const context = profile.diagnosticPrompt
      ? (isPro ? buildContext() : profile.diagnosticPrompt + '\n\n')
      : (isPro ? buildContext() : '')
    await submit(t, context, apiKey || undefined)
  }

  function handleReset() {
    reset()
    setInput('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function saveApiKey() {
    const k = apiKeyInput.trim()
    setApiKey(k)
    try { localStorage.setItem(API_KEY_STORE, k) } catch { /* ignore */ }
    setShowKeyPanel(false)
  }

  const isActive   = state === 'THINKING' || state === 'STREAMING'
  const isComplete = state === 'COMPLETE'
  const charsLeft  = MAX - input.length
  const warn       = charsLeft < 200
  const hasContext = profile.sessions.length > 0 || profile.metrics.length > 0 || !!profile.diagnostic

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#FAFAF8', paddingBottom: '6rem' }}>
      <Nav />

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-5">

        {/* Boat + counter */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <SailboatAnimation state={state} />
          </div>
          <div className="flex-shrink-0 pb-1">
            <DailyCounter used={usedToday} isPro={isPro} />
          </div>
        </div>

        {/* Diagnostic / context indicator */}
        {hasContext && state === 'IDLE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding:    '0.625rem 0.875rem',
              background: 'rgba(201,169,110,0.07)',
              border:     '1px solid rgba(201,169,110,0.2)',
              display:    'flex',
              alignItems: 'center',
              gap:        '0.5rem',
            }}
          >
            <span style={{ color: '#C9A96E', fontSize: '0.6rem' }}>◆</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', letterSpacing: '0.02em' }}>
              {profile.diagnostic
                ? `Diagnostic loaded — ${profile.diagnostic.industry} · ${profile.diagnostic.teamSize} · Health score active`
                : `Session memory active — ${profile.sessions.length} prior ${profile.sessions.length === 1 ? 'strategy' : 'strategies'} on record`
              }
            </span>
          </motion.div>
        )}

        {/* Active API key indicator */}
        {apiKey && state === 'IDLE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding:    '0.5rem 0.875rem',
              background: 'rgba(12,12,14,0.03)',
              border:     '1px solid rgba(12,12,14,0.08)',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap:        '0.5rem',
            }}
          >
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#71717A' }}>
              Custom API key active · {apiKey.slice(0, 8)}…
            </span>
            <button
              onClick={() => setShowKeyPanel(true)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Change
            </button>
          </motion.div>
        )}

        {/* Status */}
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.p
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="label-caps text-center"
            >
              {state === 'THINKING' ? 'Retrieving benchmarks…' : 'Composing analysis…'}
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
              style={{
                background: '#FFFFFF',
                border:     `1px solid ${isActive ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.11)'}`,
                overflow:   'hidden',
                transition: 'border-color 0.25s',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit() }
                }}
                placeholder={PLACEHOLDERS[phIdx]}
                disabled={isActive}
                rows={4}
                className="w-full p-5 bg-transparent disabled:opacity-40"
                style={{ color: '#0C0C0E', caretColor: '#C9A96E', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', lineHeight: 1.7 }}
              />
              <div className="mx-5"><WaveRule color="#0C0C0E" opacity={0.07} /></div>
              <div className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="flex items-center gap-4">
                  <span className="label-caps hidden sm:block">{isMac ? '⌘' : 'Ctrl'} + Enter</span>
                  {input.length > 0 && (
                    <span className="label-caps tabular-nums" style={{ color: warn ? '#991B1B' : '#A1A1AA' }}>
                      {charsLeft}
                    </span>
                  )}
                </div>
                <HelmButton state={state} onClick={handleSubmit} disabled={isActive || !input.trim()} />
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
              style={{ padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(153,27,27,0.05)', border: '1px solid rgba(153,27,27,0.18)' }}
            >
              <span style={{ color: '#991B1B', lineHeight: 1.5, flexShrink: 0 }}>⚠</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.6, color: '#991B1B', margin: 0 }}>
                {error === 'RATE_LIMIT'
                  ? 'Request limit reached. Please wait a moment before trying again.'
                  : error.toLowerCase().includes('sign in') || error.toLowerCase().includes('unauthorized')
                  ? <span>Session expired. <a href="/login" style={{ color: '#991B1B', textDecoration: 'underline' }}>Sign in again →</a></span>
                  : error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Key Panel — shown on quota errors or manually */}
        <AnimatePresence>
          {showKeyPanel && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ padding: '1.25rem', background: '#FFFFFF', border: '1px solid rgba(12,12,14,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA', margin: 0 }}>
                  Gemini API Key
                </p>
                <button onClick={() => setShowKeyPanel(false)} style={{ color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#71717A', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                Paste your own key from{' '}
                <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E' }}>
                  aistudio.google.com
                </a>
                {' '}→ Get API key → Create API key (new project).
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy…"
                  style={{
                    flex: 1, padding: '0.625rem 0.75rem',
                    border: '1px solid rgba(12,12,14,0.15)',
                    background: 'transparent', outline: 'none',
                    fontFamily: 'Inter, monospace', fontSize: '0.8rem', color: '#0C0C0E',
                  }}
                />
                <button
                  onClick={saveApiKey}
                  style={{
                    padding: '0.625rem 1rem', background: '#0C0C0E', color: '#FAFAF8',
                    border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                  }}
                >
                  Save
                </button>
                {apiKey && (
                  <button
                    onClick={() => { setApiKey(''); setApiKeyInput(''); localStorage.removeItem(API_KEY_STORE); setShowKeyPanel(false) }}
                    style={{ padding: '0.625rem 0.75rem', background: 'transparent', border: '1px solid rgba(12,12,14,0.12)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#71717A' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {(state === 'STREAMING' || isComplete) && (
            <motion.div key="answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <AnswerCard result={result} streamText={streamText} isStreaming={state === 'STREAMING'} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* New analysis */}
        <AnimatePresence>
          {isComplete && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-center pb-8">
              <button onClick={handleReset} className="btn-ghost flex items-center gap-2.5">
                <HelmSVG /> New analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaywallModal open={showPaywall} onClose={closePaywall} />

      {/* Settings / API key button */}
      <button
        onClick={() => setShowKeyPanel(o => !o)}
        aria-label="API key settings"
        title="Configure Gemini API key"
        style={{
          position: 'fixed', bottom: '5.5rem', right: '4rem', zIndex: 50,
          width: '2.25rem', height: '2.25rem', borderRadius: '50%',
          background: apiKey ? 'rgba(201,169,110,0.15)' : 'rgba(12,12,14,0.07)',
          border: apiKey ? '1.5px solid rgba(201,169,110,0.4)' : '1.5px solid rgba(12,12,14,0.12)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={apiKey ? '#C9A96E' : '#71717A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* Feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed', bottom: '5.5rem', right: '1.25rem', zIndex: 50,
          width: '2.25rem', height: '2.25rem', borderRadius: '50%',
          background: '#0C0C0E', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAFAF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
    </main>
  )
}

function HelmSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5"  stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5"  stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="2.5"  x2="12" y2="9.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="14.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5"  y1="12" x2="9.5"  y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
