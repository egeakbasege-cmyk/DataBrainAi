'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence }    from 'framer-motion'
import { Nav }                        from '@/components/Nav'
import { HelmButton }                 from '@/components/HelmButton'
import { SailboatAnimation }          from '@/components/SailboatAnimation'
import { AnswerCard }                 from '@/components/AnswerCard'
import { DailyCounter }               from '@/components/DailyCounter'
import { PaywallModal }               from '@/components/PaywallModal'
import { FeedbackModal }              from '@/components/FeedbackModal'
import { FileAttachmentPill }         from '@/components/FileAttachmentPill'
import type { Attachment }            from '@/components/FileAttachmentPill'
import { useSailState }               from '@/hooks/useSailState'
import { useSubscription }            from '@/hooks/useSubscription'
import { useBusinessContext }         from '@/lib/context/BusinessContext'

const PLACEHOLDERS = [
  'E-commerce store, £8k/month revenue, 1.5% conversion rate, 68% cart abandonment…',
  'B2B agency, 6 retainer clients, £18k MRR, need to stabilise pipeline…',
  'SaaS product, 340 free users, 4% monthly churn, no paid conversions yet…',
  'Personal training, 12 active clients, £95/session, want to increase throughput…',
]

const MAX            = 2000
const API_KEY_STORE  = 'sail_groq_key'
const MAX_FILE_BYTES = 5 * 1024 * 1024  // 5 MB

/* ── Client-side file → Attachment ──────────────────────────── */
async function parseFile(file: File): Promise<Attachment> {
  const isImage = file.type.startsWith('image/')

  if (isImage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        // dataUrl = "data:image/png;base64,<b64>"
        const base64  = dataUrl.split(',')[1]
        resolve({
          name:     file.name,
          size:     file.size,
          mimeType: file.type,
          isImage:  true,
          content:  base64,
          preview:  dataUrl,
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // CSV / TSV
  if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const text   = reader.result as string
        const lines  = text.split('\n').filter(l => l.trim())
        const header = lines[0] ?? ''
        const sample = lines.slice(1, 51).join('\n')
        const summary = `Rows: ${lines.length - 1}\nColumns: ${header}\n\nSample data (first 50 rows):\n${header}\n${sample}`
        resolve({ name: file.name, size: file.size, mimeType: file.type, isImage: false, content: summary })
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // XLSX — dynamic import to avoid SSR issues
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const XLSX    = await import('xlsx')
          const wb      = XLSX.read(reader.result, { type: 'array' })
          const parts: string[] = []
          for (const sheetName of wb.SheetNames.slice(0, 3)) {
            const ws   = wb.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
            const cols = json.length > 0 ? Object.keys(json[0]).join(', ') : 'unknown'
            const rows = json.slice(0, 50).map(r => Object.values(r).join('\t')).join('\n')
            parts.push(`Sheet: ${sheetName}\nRows: ${json.length}\nColumns: ${cols}\n\n${rows}`)
          }
          resolve({ name: file.name, size: file.size, mimeType: file.type, isImage: false, content: parts.join('\n\n---\n\n') })
        } catch (e) { reject(e) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  // PDF — text extraction (best-effort; binary PDF will show garbled text)
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const raw   = reader.result as string
        // Extract readable ASCII text from PDF binary
        const clean = raw.replace(/[^\x20-\x7E\n\t]/g, ' ').replace(/\s{3,}/g, '\n').slice(0, 12000)
        const content = clean.length > 200
          ? `PDF content (extracted text):\n${clean}`
          : `[PDF: ${file.name} — text could not be extracted from this file. Please describe the key metrics manually.]`
        resolve({ name: file.name, size: file.size, mimeType: file.type, isImage: false, content })
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  // Unsupported
  throw new Error(`Unsupported file type: ${file.type || file.name}`)
}

export default function ChatPage() {
  const [input,        setInput]        = useState('')
  const [phIdx,        setPhIdx]        = useState(0)
  const [isMac,        setIsMac]        = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const [apiKey,       setApiKey]       = useState('')
  const [apiKeyInput,  setApiKeyInput]  = useState('')
  const [attachment,   setAttachment]   = useState<Attachment | null>(null)
  const [fileError,    setFileError]    = useState('')
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Save completed strategies + deduct 1 credit ONLY when a full strategy is returned
  // Clarifying questions (needsMetrics) do NOT consume a daily limit
  useEffect(() => {
    if (state === 'COMPLETE' && result && !('needsMetrics' in result)) {
      addSession(input, `${result.headline} — target: ${result.target30}`)
      recordUsage()
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
    // Note: recordUsage() is intentionally NOT called here.
    // Credit deduction happens only after a full StrategyResult is received.
    const context = profile.diagnosticPrompt
      ? (isPro ? buildContext() : profile.diagnosticPrompt + '\n\n')
      : (isPro ? buildContext() : '')
    await submit(t, context, apiKey || undefined, attachment ?? undefined)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return
    setFileError('')

    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File too large — max 5 MB (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB)`)
      return
    }

    try {
      const parsed = await parseFile(file)
      setAttachment(parsed)
    } catch (err: any) {
      setFileError(err.message ?? 'Could not read file. Please try a different format.')
    }
  }

  function handleReset() {
    reset()
    setInput('')
    setAttachment(null)
    setFileError('')
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

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-4">

        {/* ── Header: Boat animation + counter ── */}
        <div
          style={{
            background:   '#FFFFFF',
            border:       '1px solid rgba(0,0,0,0.08)',
            borderRadius: '12px',
            overflow:     'hidden',
          }}
        >
          <SailboatAnimation state={state} />

          {/* Context + counter bar */}
          <div
            style={{
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
              padding:       '0.5rem 1rem',
              borderTop:     '1px solid rgba(0,0,0,0.06)',
              background:    'rgba(0,0,0,0.015)',
              gap:           '0.75rem',
              flexWrap:      'wrap',
            }}
          >
            {/* Context badge */}
            {hasContext ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#C9A96E', fontSize: '0.55rem' }}>◆</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A' }}>
                  {profile.diagnostic
                    ? `${profile.diagnostic.industry} · ${profile.diagnostic.teamSize} · Diagnostic loaded`
                    : `${profile.sessions.length} prior ${profile.sessions.length === 1 ? 'strategy' : 'strategies'} in memory`}
                </span>
              </div>
            ) : (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#A1A1AA', letterSpacing: '0.03em' }}>
                No session context
              </span>
            )}
            <DailyCounter used={usedToday} isPro={isPro} />
          </div>
        </div>

        {/* ── API key indicator (compact) ── */}
        {apiKey && state === 'IDLE' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding:       '0.4rem 0.875rem',
              background:    'rgba(201,169,110,0.06)',
              border:        '1px solid rgba(201,169,110,0.2)',
              borderRadius:  '6px',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
              gap:           '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A' }}>
                Custom key · {apiKey.slice(0, 8)}…
              </span>
            </div>
            <button
              onClick={() => setShowKeyPanel(true)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#C9A96E', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Change
            </button>
          </motion.div>
        )}

        {/* ── Input area ── */}
        <AnimatePresence mode="wait">
          {!isComplete && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              {/* Status label above input */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      gap:           '0.5rem',
                      marginBottom:  '0.5rem',
                      paddingLeft:   '0.25rem',
                    }}
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{
                        display:      'inline-block',
                        width:         6,
                        height:        6,
                        borderRadius: '50%',
                        background:   '#C9A96E',
                        flexShrink:   0,
                      }}
                    />
                    <span className="label-caps" style={{ color: '#71717A' }}>
                      {state === 'THINKING' ? 'Retrieving benchmarks…' : 'Composing analysis…'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input card */}
              <div
                style={{
                  background:   '#FFFFFF',
                  border:       `1.5px solid ${isActive ? 'rgba(201,169,110,0.5)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                  overflow:     'hidden',
                  boxShadow:    isActive ? '0 0 0 3px rgba(201,169,110,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
                  transition:   'border-color 0.25s, box-shadow 0.25s',
                }}
              >
                {/* Attachment pill (above textarea, inside card) */}
                <AnimatePresence>
                  {attachment && (
                    <div style={{ padding: '0.625rem 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <FileAttachmentPill
                        attachment={attachment}
                        analyzing={isActive}
                        onRemove={() => { setAttachment(null); setFileError('') }}
                      />
                    </div>
                  )}
                </AnimatePresence>

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
                  className="w-full bg-transparent disabled:opacity-40"
                  style={{
                    padding:    '1.125rem 1.25rem 0.875rem',
                    color:      '#0C0C0E',
                    caretColor: '#C9A96E',
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '0.9rem',
                    lineHeight: 1.7,
                    resize:     'none',
                  }}
                />

                {/* Toolbar */}
                <div
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'space-between',
                    padding:       '0.625rem 1.25rem 0.875rem',
                    borderTop:     '1px solid rgba(0,0,0,0.06)',
                    gap:           '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>

                    {/* + Attach button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isActive}
                      title="Attach file (CSV, XLSX, PDF, image)"
                      aria-label="Attach file"
                      style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        width:           30,
                        height:          30,
                        borderRadius:    '6px',
                        background:      attachment ? 'rgba(201,169,110,0.1)' : 'rgba(0,0,0,0.05)',
                        border:          attachment ? '1px solid rgba(201,169,110,0.4)' : '1px solid transparent',
                        cursor:          isActive ? 'not-allowed' : 'pointer',
                        opacity:         isActive ? 0.4 : 1,
                        transition:      'all 0.15s',
                        flexShrink:      0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={attachment ? '#C9A96E' : '#71717A'}
                        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.xlsx,.xls,.pdf,image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />

                    {/* Keyboard shortcut hint */}
                    <span className="label-caps hidden sm:block" style={{ color: '#C9A9AA' }}>
                      {isMac ? '⌘' : 'Ctrl'} + Enter
                    </span>

                    {/* Char counter */}
                    {input.length > 0 && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="label-caps tabular-nums"
                        style={{ color: warn ? '#991B1B' : '#C8C8D0' }}
                      >
                        {charsLeft}
                      </motion.span>
                    )}
                  </div>
                  <HelmButton state={state} onClick={handleSubmit} disabled={isActive || !input.trim()} />
                </div>
              </div>

              {/* File error */}
              <AnimatePresence>
                {fileError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#991B1B', marginTop: '0.375rem', paddingLeft: '0.25rem' }}
                  >
                    {fileError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Quick picks */}
              {state === 'IDLE' && input.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ marginTop: '0.625rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}
                >
                  {PLACEHOLDERS.map((ph, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const q = ph.split('…')[0].split(',')[0].trim().replace(/^[A-Z-a-z\s]+,?\s*/, '')
                        const questions = [
                          'How do I get my first 10 paying customers?',
                          'Where am I losing money?',
                          'What should I focus on this month?',
                          'How do I raise prices without losing clients?',
                        ]
                        setInput(questions[i] ?? questions[0])
                        textareaRef.current?.focus()
                      }}
                      style={{
                        padding:       '0.3rem 0.75rem',
                        border:        '1px solid rgba(0,0,0,0.1)',
                        borderRadius:  '999px',
                        background:    '#FFFFFF',
                        fontFamily:    'Inter, sans-serif',
                        fontSize:      '0.72rem',
                        color:         '#71717A',
                        cursor:        'pointer',
                        whiteSpace:    'nowrap',
                        transition:    'border-color 0.15s, color 0.15s',
                      }}
                    >
                      {['First 10 customers', 'Find losses', 'Monthly focus', 'Raise prices'][i]}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding:      '0.875rem 1rem',
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '0.75rem',
                background:   'rgba(153,27,27,0.04)',
                border:       '1px solid rgba(153,27,27,0.16)',
                borderRadius: '8px',
              }}
            >
              <span style={{ color: '#991B1B', lineHeight: 1.5, flexShrink: 0, fontSize: '0.85rem' }}>⚠</span>
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

        {/* ── API Key Panel ── */}
        <AnimatePresence>
          {showKeyPanel && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding:      '1.25rem',
                background:   '#FFFFFF',
                border:       '1px solid rgba(12,12,14,0.1)',
                borderRadius: '10px',
                boxShadow:    '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA', margin: 0 }}>
                  Groq API Key
                </p>
                <button onClick={() => setShowKeyPanel(false)} style={{ color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#71717A', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                Paste your own key from{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E' }}>console.groq.com</a>
                {' '}→ API Keys → Create API key.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="gsk_…"
                  style={{
                    flex: 1, padding: '0.625rem 0.75rem',
                    border: '1px solid rgba(12,12,14,0.15)', borderRadius: '6px',
                    background: 'transparent', outline: 'none',
                    fontFamily: 'Inter, monospace', fontSize: '0.8rem', color: '#0C0C0E',
                  }}
                />
                <button onClick={saveApiKey} style={{
                  padding: '0.625rem 1rem', background: '#0C0C0E', color: '#FAFAF8',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>
                  Save
                </button>
                {apiKey && (
                  <button
                    onClick={() => { setApiKey(''); setApiKeyInput(''); localStorage.removeItem(API_KEY_STORE); setShowKeyPanel(false) }}
                    style={{ padding: '0.625rem 0.75rem', background: 'transparent', border: '1px solid rgba(12,12,14,0.12)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#71717A' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result ── */}
        <AnimatePresence>
          {(state === 'STREAMING' || isComplete) && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <AnswerCard result={result} streamText={streamText} isStreaming={state === 'STREAMING'} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── New analysis CTA ── */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-center pb-8"
            >
              <button onClick={handleReset} className="btn-ghost flex items-center gap-2.5">
                <HelmSVG /> New analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaywallModal open={showPaywall} onClose={closePaywall} />

      {/* Settings button */}
      <button
        onClick={() => setShowKeyPanel(o => !o)}
        aria-label="API key settings"
        title="Configure Groq API key"
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
