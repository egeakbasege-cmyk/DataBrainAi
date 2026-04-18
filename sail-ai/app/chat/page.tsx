'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence }       from 'framer-motion'
import { Nav }                           from '@/components/Nav'
import { HelmButton }                    from '@/components/HelmButton'
import { SailboatAnimation }             from '@/components/SailboatAnimation'
import { ExecutiveResponseCard }         from '@/components/ExecutiveResponseCard'
import { PredictiveAlertList }           from '@/components/PredictiveAlertBanner'
import { DailyCounter }                  from '@/components/DailyCounter'
import { PaywallModal }                  from '@/components/PaywallModal'
import { FeedbackModal }                 from '@/components/FeedbackModal'
import { FileAttachmentPill }            from '@/components/FileAttachmentPill'
import type { Attachment }               from '@/components/FileAttachmentPill'
import { ModeSelector }                  from '@/components/ModeSelector'
import type { AnalysisMode }             from '@/components/ModeSelector'
import { VoiceInput }                    from '@/components/VoiceInput'
import { ExportModal }                   from '@/components/ExportModal'
import { AgentStatusBar }                from '@/components/AgentStatusBar'
import { useAetherisSubmit }             from '@/hooks/useAetherisSubmit'
import { useSailState }                  from '@/hooks/useSailState'
import type { ConvMessage }              from '@/hooks/useSailState'
import { AnswerCard }                    from '@/components/AnswerCard'
import { useLanguage }                   from '@/lib/i18n/LanguageContext'
import { useSubscription }               from '@/hooks/useSubscription'
import { useBusinessContext }            from '@/lib/context/BusinessContext'
import { useAetherisStore, selectAgentMode, selectActiveAlerts } from '@/lib/aetherisStore'
import { SailAdapter }                    from '@/components/SailAdapter'
import type { SailIntent }                from '@/lib/intent'
import SailAITimeTravel                   from '@/components/SailAITimeTravel'
import TrimMode                           from '@/components/TrimMode'

// Placeholders are derived from translations — built inside the component
const PLACEHOLDER_KEYS = [
  'chat.placeholder.0',
  'chat.placeholder.1',
  'chat.placeholder.2',
  'chat.placeholder.3',
] as const

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
  const [showHistory,  setShowHistory]  = useState(false)
  const [showExport,   setShowExport]   = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [apiKey,       setApiKey]       = useState('')
  const [apiKeyInput,  setApiKeyInput]  = useState('')
  const [attachment,   setAttachment]   = useState<Attachment | null>(null)
  const [fileError,    setFileError]    = useState('')
  const [mode,         setMode]         = useState<AnalysisMode>('upwind')
  // Downwind multi-turn conversation history
  const [convHistory,  setConvHistory]  = useState<ConvMessage[]>([])
  // SAIL auto-intent streaming state
  const [sailText,     setSailText]     = useState('')
  const [sailIntent,   setSailIntent]   = useState<SailIntent>('analytic')
  const [sailPhase,    setSailPhase]    = useState<'idle' | 'streaming' | 'complete'>('idle')
  const [sailError,    setSailError]    = useState<string | null>(null)
  const sailAbortRef                   = useRef<AbortController | null>(null)

  // Aetheris store — agent mode + drift alerts (filter locally for stable refs)
  const agentMode    = useAetherisStore(selectAgentMode)
  const setAgentMode = useAetherisStore((s) => s.setAgentMode)
  const allAlerts    = useAetherisStore(selectActiveAlerts)
  const activeAlerts = allAlerts.filter((a) => !a.isResolved)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { t } = useLanguage()
  const PLACEHOLDERS = PLACEHOLDER_KEYS.map(k => t(k as import('@/lib/i18n/translations').TranslationKey))

  // ── Upwind: single-shot Aetheris (ExecutiveResponse JSON) ────────────────────
  const { state, response, error, submit, reset } = useAetherisSubmit()

  // ── Downwind: guided captain coaching (chatMessage / StrategyResult) ─────────
  const {
    state:  coachState,
    streamText,
    result: coachResult,
    error:  coachError,
    submit: coachSubmit,
    reset:  coachReset,
  } = useSailState()
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

  // Save completed analyses + deduct 1 credit when ExecutiveResponse is received
  useEffect(() => {
    if (state === 'COMPLETE' && response) {
      const summary = response.insight.slice(0, 120)
      addSession(input, summary)
      recordUsage()
      // Save to dashboard history
      try {
        const prev: unknown[] = JSON.parse(localStorage.getItem('sail_analysis_history') ?? '[]')
        prev.push({
          id:        crypto.randomUUID(),
          prompt:    input.slice(0, 120),
          headline:  summary,
          createdAt: new Date().toISOString(),
        })
        localStorage.setItem('sail_analysis_history', JSON.stringify(prev.slice(-100)))
      } catch { /* ignore */ }
      // Persist to DB for Pro users
      if (isPro) {
        fetch('/api/sessions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            prompt:  input,
            summary,
            sector:  input.slice(0, 120),
            output:  { headline: summary },
          }),
        }).catch(() => undefined)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, response])

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

  // ── Update conversation history when captain returns a coaching turn ─────────
  useEffect(() => {
    if (!coachResult || !('chatMessage' in coachResult)) return
    setConvHistory(prev => [
      ...prev,
      { role: 'assistant' as const, content: coachResult.chatMessage },
    ])
    setInput('')
  }, [coachResult])

  async function handleSubmit() {
    const txt = input.trim()
    if (!txt || isActive) return
    if (!canAnalyse && !isConversing) { triggerPaywall(); return }

    const context = profile.diagnosticPrompt
      ? (isPro ? buildContext() : profile.diagnosticPrompt + '\n\n')
      : (isPro ? buildContext() : '')

    if (isSail) {
      await handleSailSubmit(txt)
    } else if (isDownwind || isTrim) {
      const updatedHistory: ConvMessage[] = [
        ...convHistory,
        { role: 'user', content: txt },
      ]
      setConvHistory(updatedHistory)
      await coachSubmit(
        txt,
        context || undefined,
        apiKey || undefined,
        attachment ?? undefined,
        isTrim ? 'trim' : 'downwind',
        updatedHistory,
        agentMode as any,
      )
    } else {
      await submit(txt, {
        context:      context || undefined,
        attachment:   attachment ?? undefined,
        analysisMode: mode,
        apiKey:       apiKey || undefined,
      })
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return
    setFileError('')

    if (file.size > MAX_FILE_BYTES) {
      setFileError(t('chat.fileTooLarge').replace('{size}', (file.size / (1024 * 1024)).toFixed(1)))
      return
    }

    try {
      const parsed = await parseFile(file)
      setAttachment(parsed)
    } catch {
      setFileError(t('chat.fileReadError'))
    }
  }

  function handleReset() {
    sailAbortRef.current?.abort()
    setSailText('')
    setSailPhase('idle')
    setSailError(null)
    reset()
    coachReset()
    setInput('')
    setAttachment(null)
    setFileError('')
    setConvHistory([])
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function saveApiKey() {
    const k = apiKeyInput.trim()
    setApiKey(k)
    try { localStorage.setItem(API_KEY_STORE, k) } catch { /* ignore */ }
    setShowKeyPanel(false)
  }

  // ── SAIL submit (Groq streaming via /api/chat) ───────────────────────────────
  async function handleSailSubmit(txt: string) {
    sailAbortRef.current?.abort()
    sailAbortRef.current = new AbortController()
    setSailText('')
    setSailIntent('analytic')
    setSailError(null)
    setSailPhase('streaming')

    const storeState = useAetherisStore.getState()
    const language   = storeState.language ?? 'en'

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:      txt,
          analysisMode: 'sail',
          sessionId:    storeState.sessionId || 'sail-init',
          userId:       storeState.userId    || 'anonymous',
          language,
          agentMode:    agentMode,
          context:      profile.diagnosticPrompt || undefined,
        }),
        signal: sailAbortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed.' }))
        throw new Error(err.error ?? 'SAIL request failed.')
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let metaParsed = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // First chunk contains metadata JSON line
        if (!metaParsed && buffer.includes('\n')) {
          const firstLine = buffer.slice(0, buffer.indexOf('\n'))
          try {
            const meta = JSON.parse(firstLine)
            if (meta.__sailMeta) {
              setSailIntent(meta.__sailMeta.intent as SailIntent)
              buffer = buffer.slice(buffer.indexOf('\n') + 1)
              metaParsed = true
            }
          } catch { metaParsed = true }
        }

        setSailText(buffer)
      }
      setSailPhase('complete')
      recordUsage()
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setSailError(err instanceof Error ? err.message : 'SAIL request failed. Please try again.')
      setSailPhase('idle')
    }
  }

  // ── Mode-conditional derived state ───────────────────────────────────────────
  const isSail       = mode === 'sail'
  const isDownwind   = mode === 'downwind'
  const isTrim       = mode === 'trim'
  const isActive     = isSail
    ? sailPhase === 'streaming'
    : isDownwind || isTrim
    ? coachState === 'THINKING' || coachState === 'STREAMING'
    : state === 'THINKING'
  const isComplete   = isSail
    ? sailPhase === 'complete'
    : isDownwind || isTrim
    ? coachState === 'COMPLETE' || coachState === 'ERROR'
    : state === 'COMPLETE' || state === 'ERROR'
  const isConversing = (isDownwind || isTrim) && coachState === 'CONVERSING'
  const currentError = isSail ? sailError : (isDownwind || isTrim) ? coachError : error

  // SailState for HelmButton + SailboatAnimation
  const sailState = isDownwind
    ? coachState
    : isSail
    ? (sailPhase === 'streaming' ? 'STREAMING' : sailPhase === 'complete' ? 'COMPLETE' : 'IDLE') as import('@/hooks/useSailState').SailState
    : (state === 'ERROR' ? 'COMPLETE' : state) as import('@/hooks/useSailState').SailState
  const charsLeft  = MAX - input.length
  const warn       = charsLeft < 200
  const hasContext = profile.sessions.length > 0 || profile.metrics.length > 0 || !!profile.diagnostic

  return (
    <>
    {/* Trim Mode: Minimal Chart Course Interface */}
    {isTrim && (
      <TrimMode />
    )}
    
    {/* Standard UI for other modes */}
    {!isTrim && (
    <>
    {/* Aetheris agent status bar — fixed top-right */}
    <div style={{ position: 'fixed', top: '1px', right: 0, zIndex: 50, padding: '6px 16px' }}>
      <AgentStatusBar />
    </div>
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8', paddingBottom: '6rem' }}>
      <Nav />

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-4">

        {/* ── Header: Boat animation + counter ── */}
        <div
          style={{
            background:   '#FFFFFF',
            border:       '1px solid rgba(0,0,0,0.08)',
            borderRadius: '12px',
            overflow:     'hidden',
            position:     'relative',
          }}
        >
          {/* Background photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sail-horizontal.jpg" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.07, pointerEvents: 'none', userSelect: 'none' }} />
          <SailboatAnimation state={sailState} />

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
                    ? `${profile.diagnostic.industry} · ${profile.diagnostic.teamSize} · ${t('chat.diagnosticLoaded')}`
                    : `${profile.sessions.length} ${t('chat.sessionMemory')}`}
                </span>
                {profile.sessions.length > 0 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    title={t('chat.sessionHistoryTitle')}
                    style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', color: '#C9A96E' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.63rem', fontWeight: 500 }}>History</span>
                  </button>
                )}
              </div>
            ) : (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#A1A1AA', letterSpacing: '0.03em' }}>
                {t('chat.noContext')}
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
          {(!isComplete || isConversing) && (
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
                      {t('chat.thinking')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mode selector — hidden while any mode is active */}
              {state === 'IDLE' && sailPhase === 'idle' && (
                <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <ModeSelector mode={mode} onChange={setMode} />
                </div>
              )}

              {/* Downwind conversation indicator */}
              {isConversing && convHistory.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', padding: '0.4rem 0.75rem', background: 'rgba(0,150,136,0.06)', border: '1px solid rgba(0,150,136,0.18)', borderRadius: '6px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00695C', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#00695C', fontWeight: 500 }}>
                    {t('chat.guidedSession')} · {Math.floor(convHistory.length / 2)} {convHistory.length > 2 ? t('chat.exchangesPlural') : t('chat.exchanges')} so far
                  </span>
                  <button onClick={handleReset} style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#71717A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    {t('chat.startOver')}
                  </button>
                </div>
              )}

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
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleSubmit() }
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

                    {/* Voice input */}
                    <VoiceInput
                      disabled={isActive}
                      onTranscript={text => setInput(prev => prev ? `${prev} ${text}` : text)}
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
                  <HelmButton state={sailState} onClick={() => void handleSubmit()} disabled={isActive || !input.trim()} />
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
                  {([
                    ['chat.pick.firstCustomers', 'chat.q.firstCustomers'],
                    ['chat.pick.findLosses',     'chat.q.loseMoney'],
                    ['chat.pick.monthlyFocus',   'chat.q.monthlyFocus'],
                    ['chat.pick.raisePrices',    'chat.q.raisePrices'],
                  ] as const).map(([labelKey, questionKey], i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(t(questionKey as import('@/lib/i18n/translations').TranslationKey))
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
                      {t(labelKey as import('@/lib/i18n/translations').TranslationKey)}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        <AnimatePresence>
          {currentError && (
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
                {currentError === 'RATE_LIMIT'
                  ? 'Request limit reached. Please wait a moment before trying again.'
                  : (currentError ?? '').toLowerCase().includes('sign in') || (currentError ?? '').toLowerCase().includes('unauthorized')
                  ? <span>Session expired. <a href="/login" style={{ color: '#991B1B', textDecoration: 'underline' }}>Sign in again →</a></span>
                  : currentError}
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

        {/* ── Drift alerts (from Zustand store) ── */}
        <AnimatePresence>
          {activeAlerts.length > 0 && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PredictiveAlertList alerts={activeAlerts} variant="light" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result ── */}
        <AnimatePresence>
          {/* SAIL: adaptive streaming renderer */}
          {isSail && (sailPhase === 'streaming' || sailPhase === 'complete') && (
            <motion.div
              key="sail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                background:   '#FFFFFF',
                border:       '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px',
                padding:      '1.25rem 1.25rem 1.5rem',
                boxShadow:    '0 1px 6px rgba(0,0,0,0.04)',
              }}
            >
              <SailAdapter
                text={sailText}
                intent={sailIntent}
                streaming={sailPhase === 'streaming'}
              />
            </motion.div>
          )}

          {/* Downwind/Trim: captain coaching card */}
          {(isDownwind || isTrim) && (coachState === 'THINKING' || coachState === 'STREAMING' || coachState === 'COMPLETE' || coachState === 'CONVERSING') && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <AnswerCard
                result={coachResult}
                streamText={streamText}
                isStreaming={coachState === 'THINKING' || coachState === 'STREAMING'}
                agentMode={agentMode as any}
              />
            </motion.div>
          )}

          {/* Upwind: executive response card */}
          {!isDownwind && !isTrim && !isSail && (state === 'THINKING' || isComplete) && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ExecutiveResponseCard
                response={response}
                isStreaming={state === 'THINKING'}
                variant="light"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── New analysis CTA + Export ── */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', paddingBottom: '2rem' }}
            >
              <button onClick={handleReset} className="btn-ghost flex items-center gap-2.5">
                <HelmSVG /> {t('chat.newAnalysis')}
              </button>
              {response && (
                <button
                  onClick={() => setShowExport(true)}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '0.4rem',
                    padding:     '0.5rem 1rem',
                    background:  'transparent',
                    border:      '1px solid rgba(201,169,110,0.4)',
                    borderRadius:'6px',
                    cursor:      'pointer',
                    fontFamily:  'Inter, sans-serif',
                    fontSize:    '0.72rem',
                    fontWeight:  600,
                    letterSpacing:'0.06em',
                    textTransform:'uppercase',
                    color:       '#C9A96E',
                    transition:  'all 0.15s',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M4 4h16v2H4z"/><path d="M4 10h10"/><path d="M4 16h7"/><path d="M15 14l5 5m0-5l-5 5"/>
                  </svg>
                  {t('chat.export')}
                </button>
              )}
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

      {response && (
        <ExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          result={response}
          sector={input.slice(0, 60)}
        />
      )}

      {/* ── History Panel ── */}
      {showHistory && (
        <>
          <div onClick={() => setShowHistory(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50 }} />
          <div style={{
            position:   'fixed',
            top:        0,
            right:      0,
            bottom:     0,
            width:      'min(380px, 92vw)',
            background: '#FAFAF8',
            boxShadow:  '-8px 0 32px rgba(0,0,0,0.12)',
            zIndex:     51,
            display:    'flex',
            flexDirection: 'column',
            overflow:   'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.1rem', fontWeight: 600, color: '#0C0C0E', margin: 0 }}>{t('chat.sessionMemoryTitle')}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A', margin: '2px 0 0' }}>{profile.sessions.length} {t(profile.sessions.length === 1 ? 'chat.analysis' : 'chat.analyses')} {t('chat.pastRecorded')}</p>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#71717A', lineHeight: 1 }}>×</button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {profile.sessions.length === 0 ? (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#A1A1AA', textAlign: 'center', marginTop: '2rem' }}>{t('chat.noAnalysesYet')}</p>
              ) : (
                [...profile.sessions].reverse().map((s, i) => {
                  const key      = s.id ?? String(i)
                  const expanded = expandedSession === key
                  return (
                    <div
                      key={key}
                      onClick={() => setExpandedSession(expanded ? null : key)}
                      style={{
                        padding:      '0.875rem 1rem',
                        marginBottom: '0.5rem',
                        background:   expanded ? '#FFF9F0' : '#FFFFFF',
                        border:       `1px solid ${expanded ? 'rgba(201,169,110,0.4)' : 'rgba(0,0,0,0.07)'}`,
                        borderRadius: '8px',
                        cursor:       'pointer',
                        transition:   'background 0.15s, border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 4px', lineHeight: 1.4, flex: 1 }}>
                          {s.prompt}
                        </p>
                        <span style={{ color: '#C9A96E', fontSize: '0.65rem', flexShrink: 0, marginTop: '2px' }}>{expanded ? '▲' : '▼'}</span>
                      </div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#71717A', margin: '0 0 6px', lineHeight: 1.5 }}>
                        {expanded ? s.summary : `${s.summary?.slice(0, 120) ?? ''}${(s.summary?.length ?? 0) > 120 ? '…' : ''}`}
                      </p>
                      {s.createdAt && (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#A1A1AA', margin: 0 }}>
                          {new Date(s.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      {expanded && (
                        <button
                          onClick={e => { e.stopPropagation(); setInput(s.prompt ?? ''); setShowHistory(false) }}
                          style={{ marginTop: '0.75rem', padding: '0.35rem 0.75rem', background: '#0C0C0E', color: '#FAFAF8', border: 'none', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', cursor: 'pointer' }}
                        >
                          {t('chat.rerunAnalysis')}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
    </>
    )}
    </>
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
