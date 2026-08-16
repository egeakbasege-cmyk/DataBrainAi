'use client'

/**
 * app/chat/page.tsx — Thin Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 * All business logic lives here. UI rendering is delegated entirely to
 * components/chat/* and components/ChatThread.tsx.
 *
 * This file: state · effects · event handlers · route-level auth guard.
 * Nothing else.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession }                   from 'next-auth/react'
import { useRouter }                    from 'next/navigation'
import { motion, AnimatePresence }      from 'framer-motion'
import { Nav }                          from '@/components/Nav'
import { BrandSetupModal }              from '@/components/BrandSetupModal'
import { useBrandConfig }               from '@/components/BrandSetupModal'
import type { BrandConfig }             from '@/components/BrandSetupModal'
import { ExecutiveResponseCard }        from '@/components/ExecutiveResponseCard'
import { PredictiveAlertList }          from '@/components/PredictiveAlertBanner'
import { PaywallModal }                 from '@/components/PaywallModal'
import { FeedbackModal }                from '@/components/FeedbackModal'
import { FileAttachmentPill }           from '@/components/FileAttachmentPill'
import { useConnectorState }            from '@/components/ConnectorDock'
import { useUserSources }               from '@/components/UserDataImport'
import type { Attachment }              from '@/components/FileAttachmentPill'
import type { AnalysisMode }            from '@/components/ModeSelector'
import { SovereignDashboard }           from '@/components/SovereignDashboard'
import type { SovereignMode }           from '@/components/SovereignDashboard'
import { ExportModal }                  from '@/components/ExportModal'
import { AgentStatusBar }               from '@/components/AgentStatusBar'
import type { TrimResponse }            from '@/components/TrimTimelineCard'
import type { CatamaranResponse }       from '@/types/chat'
import { useAetherisSubmit }            from '@/hooks/useAetherisSubmit'
import { useSailState }                 from '@/hooks/useSailState'
import type { ConvMessage }             from '@/hooks/useSailState'
import { useLanguage }                  from '@/lib/i18n/LanguageContext'
import { useSubscription }              from '@/hooks/useSubscription'
import { useBusinessContext }           from '@/lib/context/BusinessContext'
import { useAetherisStore, selectAgentMode, selectActiveAlerts } from '@/lib/aetherisStore'
import { SailAdapter }                  from '@/components/SailAdapter'
import type { SailIntent }              from '@/lib/intent'
import { MoodGuideCard }                from '@/components/MoodGuideCard'
import type { MoodGuideData }           from '@/components/MoodGuideCard'
import { useChatMessages }              from '@/hooks/useChatMessages'
import { ConsumerChat }                 from '@/components/ConsumerChat'
import { useUserType }                  from '@/components/Dock'
// ── New architecture UI components ────────────────────────────────────────────
import { GuideRail }                    from '@/components/chat/GuideRail'
import { ChatStage }                    from '@/components/chat/ChatStage'
import { ChatComposer }                 from '@/components/chat/ChatComposer'
import { PortofinoScene }               from '@/components/landing/PortofinoScene'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX             = 2000
const API_KEY_STORE   = 'sail_groq_key'
const MAX_FILE_BYTES  = 5 * 1024 * 1024
const CONTEXT_TOGGLE_KEY = 'sail_use_profile_context'
const PLACEHOLDER_KEYS = ['chat.placeholder.0','chat.placeholder.1','chat.placeholder.2','chat.placeholder.3'] as const

// ── File parser ───────────────────────────────────────────────────────────────

async function parseFile(file: File): Promise<Attachment> {
  const isImage = file.type.startsWith('image/')

  if (isImage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        resolve({ name: file.name, size: file.size, mimeType: file.type, isImage: true, content: dataUrl.split(',')[1], preview: dataUrl })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const text   = reader.result as string
        const lines  = text.split('\n').filter(l => l.trim())
        const header = lines[0] ?? ''
        const sample = lines.slice(1, 51).join('\n')
        resolve({ name: file.name, size: file.size, mimeType: file.type, isImage: false, content: `Rows: ${lines.length - 1}\nColumns: ${header}\n\nSample data (first 50 rows):\n${header}\n${sample}` })
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const XLSX  = await import('xlsx')
          const wb    = XLSX.read(reader.result, { type: 'array' })
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

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const raw   = reader.result as string
        const clean = raw.replace(/[^\x20-\x7E\n\t]/g, ' ').replace(/\s{3,}/g, '\n').slice(0, 12000)
        resolve({ name: file.name, size: file.size, mimeType: file.type, isImage: false, content: clean.length > 200 ? `PDF content (extracted text):\n${clean}` : `[PDF: ${file.name} — text could not be extracted. Please describe the key metrics manually.]` })
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  throw new Error(`Unsupported file type: ${file.type || file.name}`)
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  // Auth gate
  const { status: authStatus } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/login?callbackUrl=%2Fchat')
  }, [authStatus, router])

  // ── Core UI state ──────────────────────────────────────────────────────────
  const [input,        setInput]        = useState('')
  const [phIdx,        setPhIdx]        = useState(0)
  const [isMac,        setIsMac]        = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [showExport,   setShowExport]   = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  // Brand
  const { config: brandConfig, ready: brandReady, save: saveBrand } = useBrandConfig()
  const [showBrandSetup, setShowBrandSetup] = useState(false)
  const handleBrandComplete = (cfg: BrandConfig) => { saveBrand(cfg); setShowBrandSetup(false) }

  // API key
  const [apiKey,      setApiKey]      = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')

  // File
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [fileError,  setFileError]  = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)

  // Mode
  const [mode,        setMode]        = useState<AnalysisMode>('upwind')
  const [synergyModes,setSynergyModes]= useState<AnalysisMode[]>(['upwind', 'sail'])
  const [businessMode,setBusinessMode]= useState(true)
  const [autoMode,    setAutoMode]    = useState(false)
  const [autoPhase,   setAutoPhase]   = useState<'idle'|'routing'|'guiding'|'error'>('idle')
  const [moodGuide,   setMoodGuide]   = useState<MoodGuideData | null>(null)
  const [autoError,   setAutoError]   = useState<string | null>(null)
  const pendingAutoTextRef = useRef('')

  // Conversation history
  const [convHistory, setConvHistory] = useState<ConvMessage[]>([])
  const lastDownwindInput = useRef('')
  const processedCoachResult = useRef<import('@/hooks/useSailState').AIResponse | null>(null)

  // Mode-specific state
  const [sailText,     setSailText]     = useState('')
  const [sailIntent,   setSailIntent]   = useState<SailIntent>('analytic')
  const [sailPhase,    setSailPhase]    = useState<'idle'|'streaming'|'complete'>('idle')
  const [sailError,    setSailError]    = useState<string|null>(null)
  const sailAbortRef = useRef<AbortController|null>(null)

  const [trimResponse, setTrimResponse] = useState<TrimResponse|null>(null)
  const [trimPhase,    setTrimPhase]    = useState<'idle'|'loading'|'complete'>('idle')
  const [trimError,    setTrimError]    = useState<string|null>(null)

  const [catamaranResponse, setCatamaranResponse] = useState<CatamaranResponse|null>(null)
  const [catamaranPhase,    setCatamaranPhase]    = useState<'idle'|'loading'|'complete'>('idle')
  const [catamaranError,    setCatamaranError]    = useState<string|null>(null)

  const [synergyText,  setSynergyText]  = useState('')
  const [synergyPhase, setSynergyPhase] = useState<'idle'|'streaming'|'complete'>('idle')
  const [synergyError, setSynergyError] = useState<string|null>(null)
  const [synergyMeta,  setSynergyMeta]  = useState<{ modes: string[]; companyName: string|null }|null>(null)
  const synergyAbortRef = useRef<AbortController|null>(null)

  const [operatorText,  setOperatorText]  = useState('')
  const [operatorPhase, setOperatorPhase] = useState<'idle'|'streaming'|'complete'>('idle')
  const [operatorError, setOperatorError] = useState<string|null>(null)
  const operatorAbortRef = useRef<AbortController|null>(null)

  const [scenarioText,  setScenarioText]  = useState('')
  const [scenarioPhase, setScenarioPhase] = useState<'idle'|'streaming'|'complete'>('idle')
  const [scenarioError, setScenarioError] = useState<string|null>(null)
  const scenarioAbortRef = useRef<AbortController|null>(null)

  // Sovereign / UI
  const [showSovereign, setShowSovereign] = useState(true)
  const [showInlinePaywall, setShowInlinePaywall] = useState(false)
  const [useProfileCtx, setUseProfileCtx] = useState(true)

  // Aetheris
  const agentMode    = useAetherisStore(selectAgentMode)
  const language     = useAetherisStore((s) => s.language)
  const sessionId    = useAetherisStore((s) => s.sessionId)
  const userId       = useAetherisStore((s) => s.userId)
  const allAlerts    = useAetherisStore(selectActiveAlerts)
  const activeAlerts = allAlerts.filter((a) => !a.isResolved)

  // Hooks
  const { t } = useLanguage()
  const PLACEHOLDERS = PLACEHOLDER_KEYS.map(k => t(k as import('@/lib/i18n/translations').TranslationKey))
  const { state, response, error, submit, reset }                                  = useAetherisSubmit()
  const { state: coachState, streamText, result: coachResult, error: coachError,
          submit: coachSubmit, reset: coachReset }                                  = useSailState()
  const { isPro, usedToday, canAnalyse, showPaywall, recordUsage, triggerPaywall, closePaywall, activatePro } = useSubscription()
  const { buildContext, addSession, profile }                                       = useBusinessContext()
  const { type: userType, setType: setUserType }                                   = useUserType()
  const { enabledIds, analysisActive, toggle: toggleConnector, activeConnectorIds } = useConnectorState()
  const { userUrls }                                                                = useUserSources()

  const { messages: chatMessages, addUserMessage, startAssistantMessage,
          finalizeMessage, clearThread, compressedHistory }                         = useChatMessages()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryConstraint: string | undefined = useProfileCtx
    ? ((profile.diagnostic as any)?.obstacle || undefined)
    : undefined

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent)) }, [])

  useEffect(() => {
    return () => {
      sailAbortRef.current?.abort()
      operatorAbortRef.current?.abort()
      synergyAbortRef.current?.abort()
      scenarioAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 168)}px`
  }, [input])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(API_KEY_STORE) ?? ''
      setApiKey(stored); setApiKeyInput(stored)
    } catch { /* ignore */ }
    try {
      const ctxStored = localStorage.getItem(CONTEXT_TOGGLE_KEY)
      if (ctxStored !== null) setUseProfileCtx(ctxStored === 'true')
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) { try { setInput(decodeURIComponent(q)) } catch { setInput(q) }; window.history.replaceState({}, '', '/chat') }
    if (params.get('pro') === '1') { activatePro(); window.history.replaceState({}, '', '/chat') }
  }, [activatePro])

  useEffect(() => {
    if (state === 'COMPLETE' && response) {
      const summary = response.insight.slice(0, 120)
      addSession(input, summary)
      recordUsage()
      try {
        const prev: unknown[] = JSON.parse(localStorage.getItem('sail_analysis_history') ?? '[]')
        prev.push({ id: crypto.randomUUID(), prompt: input.slice(0, 120), headline: summary, createdAt: new Date().toISOString() })
        localStorage.setItem('sail_analysis_history', JSON.stringify(prev.slice(-100)))
      } catch { /* ignore */ }
      if (isPro) {
        fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: input, summary, sector: input.slice(0, 120), output: { headline: summary } }),
        }).catch(() => undefined)
      }
      fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: crypto.randomUUID(), query: input, summary, mode }),
      }).catch(() => undefined)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, response])

  useEffect(() => {
    if (mode !== 'downwind') return
    if (coachState !== 'COMPLETE' && coachState !== 'CONVERSING') return
    if (!coachResult) return
    if (coachResult === processedCoachResult.current) return
    processedCoachResult.current = coachResult
    const assistantContent = 'chatMessage' in coachResult
      ? coachResult.chatMessage + (coachResult.followUpQuestion ? `\n\n${coachResult.followUpQuestion}` : '')
      : 'headline' in coachResult ? coachResult.headline
      : 'question' in coachResult ? coachResult.question
      : 'freeText' in coachResult ? coachResult.freeText : ''
    setConvHistory(prev => [
      ...prev,
      { role: 'user' as const, content: lastDownwindInput.current },
      { role: 'assistant' as const, content: assistantContent },
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachState, coachResult])

  useEffect(() => {
    if (mode !== 'downwind') {
      setConvHistory([])
      processedCoachResult.current = null
      coachReset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    const e = error ?? sailError ?? trimError
    if (!e) return
    const isAiError =
      e.includes('quota')           ||
      e.includes('aistudio')        ||
      e.includes('API key')         ||
      e.includes('api key')         ||
      e.includes('Unable to reach') ||
      e.includes('AI_')             ||
      e.includes('exhausted')       ||
      e.includes('unavailable')     ||
      e.includes('not configured')  ||
      e.includes('provider')        ||
      e.includes('Invalid API')     ||
      e.includes('gsk_')            ||
      e.includes('rate limit')      ||
      e.includes('Rate limit')      ||
      e.includes('429')             ||
      e.includes('401')
    if (isAiError) setShowKeyPanel(true)
  }, [error, sailError, trimError])

  useEffect(() => {
    if (chatMessages.length > 0) setShowSovereign(false)
  }, [chatMessages.length])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getContext(): string {
    if (!useProfileCtx) return ''
    return profile.diagnosticPrompt
      ? (isPro ? buildContext() : profile.diagnosticPrompt + '\n\n')
      : (isPro ? buildContext() : '')
  }

  function saveAnalysis(prompt: string, headline: string) {
    addSession(prompt, headline)
    recordUsage()
    try {
      const prev: unknown[] = JSON.parse(localStorage.getItem('sail_analysis_history') ?? '[]')
      prev.push({ id: crypto.randomUUID(), prompt: prompt.slice(0, 120), headline: headline.slice(0, 120), createdAt: new Date().toISOString() })
      localStorage.setItem('sail_analysis_history', JSON.stringify(prev.slice(-100)))
    } catch { /* ignore */ }
  }

  function buildModeBody(text: string, analysisMode: string): Record<string, unknown> {
    const body: Record<string, unknown> = {
      message: text, sessionId: sessionId || 'init', userId: userId || 'anonymous',
      language, agentMode, analysisMode, businessMode,
      connector_ids: activeConnectorIds, user_urls: userUrls,
    }
    const history = compressedHistory({ keepTail: 6, maxTotalChars: 12_000 })
    if (history.length > 0) body.messages = history
    const ctx = getContext()
    if (ctx)               body.context           = ctx
    if (apiKey)            body.apiKey            = apiKey
    if (primaryConstraint) body.primaryConstraint = primaryConstraint
    if (attachment?.isImage) { body.imageBase64 = attachment.content; body.imageMimeType = attachment.mimeType }
    else if (attachment?.content) body.fileContent = attachment.content
    return body
  }

  // ── Submit handlers ────────────────────────────────────────────────────────

  async function handleSailSubmit(text: string) {
    setSailError(null); setSailText(''); setSailPhase('streaming')
    sailAbortRef.current = new AbortController()
    addUserMessage(text, 'sail')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(buildModeBody(text, 'sail')), signal: sailAbortRef.current.signal,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'SAIL request failed.') }
      const reader = res.body!.getReader(); const decoder = new TextDecoder()
      let buf = '', metaDone = false
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        if (!metaDone) { const nl = buf.indexOf('\n'); if (nl !== -1) { try { const m = JSON.parse(buf.slice(0, nl)); if (m.__sailMeta?.intent) setSailIntent(m.__sailMeta.intent) } catch {} buf = buf.slice(nl + 1); metaDone = true } }
        setSailText(buf)
      }
      // Write to thread only once streaming is done — avoids duplicate with StreamCard
      const assistantId = startAssistantMessage('sail')
      setSailPhase('complete'); finalizeMessage(assistantId, { type: 'text', text: buf }); saveAnalysis(text, buf.slice(0, 120))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'SAIL request failed.'
      setSailError(msg); setSailPhase('idle')
      const errId = startAssistantMessage('sail'); finalizeMessage(errId, { type: 'error', message: msg })
    }
  }

  async function handleTrimSubmit(text: string) {
    setTrimError(null); setTrimResponse(null); setTrimPhase('loading')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(buildModeBody(text, 'trim')),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'TRIM request failed.') }
      const data = await res.json() as TrimResponse
      setTrimResponse(data); setTrimPhase('complete'); saveAnalysis(text, data.summary?.slice(0, 120) ?? data.trimTitle ?? 'TRIM Plan')
    } catch (err: unknown) { setTrimError(err instanceof Error ? err.message : 'TRIM request failed.'); setTrimPhase('idle') }
  }

  async function handleCatamaranSubmit(text: string) {
    setCatamaranError(null); setCatamaranResponse(null); setCatamaranPhase('loading')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(buildModeBody(text, 'catamaran')),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'CATAMARAN request failed.') }
      const data = await res.json() as CatamaranResponse
      setCatamaranResponse(data); setCatamaranPhase('complete'); saveAnalysis(text, data.catamaranTitle ?? 'CATAMARAN Plan')
    } catch (err: unknown) { setCatamaranError(err instanceof Error ? err.message : 'CATAMARAN request failed.'); setCatamaranPhase('idle') }
  }

  async function handleSynergySubmit(text: string) {
    setSynergyError(null); setSynergyText(''); setSynergyMeta(null); setSynergyPhase('streaming')
    synergyAbortRef.current = new AbortController()
    try {
      const body = buildModeBody(text, 'synergy')
      body.synergyModes = synergyModes as unknown as Record<string, unknown>
      body.synergyName  = (brandConfig?.aiName ?? brandConfig?.companyName) as unknown as Record<string, unknown>
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(body), signal: synergyAbortRef.current.signal,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'SYNERGY request failed.') }
      const reader = res.body!.getReader(); const decoder = new TextDecoder()
      let buf = '', metaDone = false
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        if (!metaDone) { const nl = buf.indexOf('\n'); if (nl !== -1) { try { const m = JSON.parse(buf.slice(0, nl)); if (m.__synMeta) setSynergyMeta(m.__synMeta) } catch {} buf = buf.slice(nl + 1); metaDone = true } }
        setSynergyText(buf)
      }
      setSynergyPhase('complete'); saveAnalysis(text, buf.slice(0, 120))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setSynergyError(err instanceof Error ? err.message : 'SYNERGY request failed.'); setSynergyPhase('idle')
    }
  }

  async function handleOperatorSubmit(text: string) {
    setOperatorError(null); setOperatorText(''); setOperatorPhase('streaming')
    operatorAbortRef.current = new AbortController()
    addUserMessage(text, 'operator')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(buildModeBody(text, 'operator')), signal: operatorAbortRef.current.signal,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'OPERATOR request failed.') }
      const reader = res.body!.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true }); setOperatorText(buf)
      }
      // Write to thread only once streaming is done — avoids duplicate with StreamCard
      const assistantId = startAssistantMessage('operator')
      setOperatorPhase('complete'); finalizeMessage(assistantId, { type: 'text', text: buf }); saveAnalysis(text, buf.slice(0, 120))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'OPERATOR request failed.'
      setOperatorError(msg); setOperatorPhase('idle')
      const errId = startAssistantMessage('operator'); finalizeMessage(errId, { type: 'error', message: msg })
    }
  }

  async function handleScenarioSubmit(text: string) {
    setScenarioError(null); setScenarioText(''); setScenarioPhase('streaming')
    scenarioAbortRef.current = new AbortController()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(buildModeBody(text, 'scenario')), signal: scenarioAbortRef.current.signal,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'SCENARIO request failed.') }
      const reader = res.body!.getReader(); const decoder = new TextDecoder(); let buf = '', metaDone = false
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        if (!metaDone) { const nl = buf.indexOf('\n'); if (nl !== -1) { try { JSON.parse(buf.slice(0, nl)) } catch {} buf = buf.slice(nl + 1); metaDone = true } }
        setScenarioText(buf)
      }
      setScenarioPhase('complete'); saveAnalysis(text, buf.slice(0, 120))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setScenarioError(err instanceof Error ? err.message : 'SCENARIO request failed.'); setScenarioPhase('idle')
    }
  }

  async function handleAutoSubmit(text: string) {
    setAutoError(null); setMoodGuide(null); setAutoPhase('routing'); pendingAutoTextRef.current = text
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Language': language, 'X-Aetheris-Session': sessionId || 'init' },
        body: JSON.stringify(buildModeBody(text, 'auto')),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(((d as Record<string,unknown>).error ?? (d as Record<string,unknown>).message) as string ?? 'Routing request failed.') }
      const data = await res.json() as { __moodGuide?: MoodGuideData }
      if (data.__moodGuide) { setMoodGuide(data.__moodGuide); setAutoPhase('guiding') }
      else { setAutoPhase('idle'); await submit(text, { context: getContext() || undefined, attachment: attachment ?? undefined, analysisMode: 'upwind', apiKey: apiKey || undefined, primaryConstraint }) }
    } catch (err: unknown) { setAutoError(err instanceof Error ? err.message : 'Routing failed.'); setAutoPhase('error') }
  }

  function proceedWithMode(selectedMode: string, text: string) {
    setAutoPhase('idle'); setMoodGuide(null); setMode(selectedMode as AnalysisMode)
    if      (selectedMode === 'sail')      void handleSailSubmit(text)
    else if (selectedMode === 'trim')      void handleTrimSubmit(text)
    else if (selectedMode === 'catamaran') void handleCatamaranSubmit(text)
    else if (selectedMode === 'synergy')   void handleSynergySubmit(text)
    else if (selectedMode === 'operator')  void handleOperatorSubmit(text)
    else if (selectedMode === 'scenario')  void handleScenarioSubmit(text)
    else if (selectedMode === 'downwind') {
      lastDownwindInput.current = text
      void coachSubmit(text, getContext() || undefined, apiKey || undefined, attachment ?? undefined, 'downwind', convHistory.length > 0 ? convHistory : undefined, undefined, primaryConstraint)
    }
    else void submit(text, { context: getContext() || undefined, attachment: attachment ?? undefined, analysisMode: selectedMode as AnalysisMode, apiKey: apiKey || undefined, primaryConstraint })
  }

  async function handleSubmit() {
    const text = input.trim()
    if (!text) return
    if (!canAnalyse) { setShowInlinePaywall(true); return }
    setShowInlinePaywall(false)
    setInput('')

    if (autoMode) { if (autoPhase === 'routing') return; await handleAutoSubmit(text); return }
    if (mode === 'sail')     { if (sailPhase      !== 'streaming') await handleSailSubmit(text);      return }
    if (mode === 'trim')     { if (trimPhase      !== 'loading')   await handleTrimSubmit(text);      return }
    if (mode === 'catamaran'){ if (catamaranPhase !== 'loading')   await handleCatamaranSubmit(text); return }
    if (mode === 'synergy')  { if (synergyPhase   !== 'streaming' && synergyModes.length >= 2) await handleSynergySubmit(text); return }
    if (mode === 'operator') { if (operatorPhase  !== 'streaming') await handleOperatorSubmit(text);  return }
    if (mode === 'scenario') { if (scenarioPhase  !== 'streaming') await handleScenarioSubmit(text);  return }
    if (mode === 'downwind') {
      if (coachState === 'THINKING' || coachState === 'STREAMING') return
      lastDownwindInput.current = text
      await coachSubmit(text, getContext() || undefined, apiKey || undefined, attachment ?? undefined, 'downwind',
        convHistory.length > 0 ? convHistory : undefined, undefined, primaryConstraint)
      return
    }
    if (state === 'THINKING') return
    await submit(text, { context: getContext() || undefined, attachment: attachment ?? undefined, analysisMode: mode, apiKey: apiKey || undefined, primaryConstraint })
  }

  function handleReset() {
    clearThread(); sailAbortRef.current?.abort(); operatorAbortRef.current?.abort(); synergyAbortRef.current?.abort(); scenarioAbortRef.current?.abort()
    setInput(''); setAttachment(null); setFileError(''); setConvHistory([])
    setSailText(''); setSailPhase('idle'); setSailError(null)
    setTrimResponse(null); setTrimPhase('idle'); setTrimError(null)
    setCatamaranResponse(null); setCatamaranPhase('idle'); setCatamaranError(null)
    setSynergyText(''); setSynergyPhase('idle'); setSynergyError(null); setSynergyMeta(null)
    setOperatorText(''); setOperatorPhase('idle'); setOperatorError(null)
    setScenarioText(''); setScenarioPhase('idle'); setScenarioError(null)
    setShowInlinePaywall(false); setAutoPhase('idle'); setMoodGuide(null); setAutoError(null)
    pendingAutoTextRef.current = ''; processedCoachResult.current = null
    reset(); coachReset()
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function toggleProfileCtx() {
    const next = !useProfileCtx; setUseProfileCtx(next)
    try { localStorage.setItem(CONTEXT_TOGGLE_KEY, String(next)) } catch { /* ignore */ }
  }

  function saveApiKey() {
    const k = apiKeyInput.trim(); setApiKey(k)
    try { localStorage.setItem(API_KEY_STORE, k) } catch { /* ignore */ }
    setShowKeyPanel(false)
  }

  const handleFollowUp = useCallback((text: string) => {
    setInput(text); setTimeout(() => textareaRef.current?.focus(), 20)
  }, [])

  const handleSovereignSelect = useCallback((sovereignMode: SovereignMode) => {
    setMode(sovereignMode as AnalysisMode); setShowSovereign(false)
    setTimeout(() => textareaRef.current?.focus(), 120)
  }, [])

  // ── Derived state ──────────────────────────────────────────────────────────

  const isActive = autoPhase === 'routing' ? true
    : mode === 'sail'      ? sailPhase      === 'streaming'
    : mode === 'trim'      ? trimPhase      === 'loading'
    : mode === 'catamaran' ? catamaranPhase === 'loading'
    : mode === 'synergy'   ? synergyPhase   === 'streaming'
    : mode === 'operator'  ? operatorPhase  === 'streaming'
    : mode === 'scenario'  ? scenarioPhase  === 'streaming'
    : mode === 'downwind'  ? coachState === 'THINKING' || coachState === 'STREAMING'
    : state === 'THINKING'

  const isComplete = mode === 'sail'      ? sailPhase      === 'complete'
    : mode === 'trim'      ? trimPhase      === 'complete'
    : mode === 'catamaran' ? catamaranPhase === 'complete'
    : mode === 'synergy'   ? synergyPhase   === 'complete'
    : mode === 'operator'  ? operatorPhase  === 'complete'
    : mode === 'scenario'  ? scenarioPhase  === 'complete'
    : mode === 'downwind'  ? coachState === 'COMPLETE'
    : state === 'COMPLETE' || state === 'ERROR'

  const isConversing = mode === 'downwind' && coachState === 'CONVERSING'

  const sailState = (
    isActive ? 'THINKING' : isConversing ? 'CONVERSING' : isComplete ? 'COMPLETE' : 'IDLE'
  ) as import('@/hooks/useSailState').SailState

  const activeError = mode === 'sail' ? sailError
    : mode === 'trim'      ? trimError
    : mode === 'catamaran' ? catamaranError
    : mode === 'synergy'   ? synergyError
    : mode === 'operator'  ? operatorError
    : mode === 'scenario'  ? scenarioError
    : mode === 'downwind'  ? coachError
    : error

  const hasContext  = profile.sessions.length > 0 || profile.metrics.length > 0 || !!profile.diagnostic
  const contextLabel = profile.diagnostic
    ? `${profile.diagnostic.industry} · ${profile.diagnostic.teamSize}`
    : profile.sessions.length > 0
    ? `${profile.sessions.length} sessions`
    : ''

  // ── Consumer mode ──────────────────────────────────────────────────────────

  if (userType === 'consumer') {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <ConsumerChat onSwitchToBusiness={() => setUserType('business')} />
        <PaywallModal open={showPaywall} onClose={closePaywall} />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Brand setup modal */}
      <AnimatePresence>
        {showBrandSetup && <BrandSetupModal onComplete={handleBrandComplete} />}
      </AnimatePresence>

      {/* Sovereign dashboard overlay */}
      <AnimatePresence>
        {showSovereign && (
          <motion.div
            key="sovereign"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 45 }}
          >
            <SovereignDashboard
              initialMode={(['upwind','synergy','sail','trim','catamaran'] as SovereignMode[]).includes(mode as SovereignMode)
                ? mode as SovereignMode : 'upwind'}
              onModeSelect={handleSovereignSelect}
              companyName={brandConfig?.aiName ?? brandConfig?.companyName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent status bar */}
      <div style={{ position: 'fixed', top: 1, right: 0, zIndex: 50, padding: '6px 16px' }}>
        <AgentStatusBar />
      </div>

      {/* ── Portofino harbour background (fixed, behind everything) ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <PortofinoScene />
      </div>

      {/* ── Main layout: fixed, full-screen, column flex ── */}
      <div style={{
        position:        'fixed',
        inset:            0,
        display:         'flex',
        flexDirection:   'column',
        background:      'rgba(8,9,13,0.55)',
        overflow:        'hidden',
        zIndex:           1,
      }}>
        {/* Nav bar */}
        <Nav />

        {/* Content below nav */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Center column */}
          <div style={{
            flex:          1,
            overflow:     'hidden',
            display:      'flex',
            flexDirection:'column',
            maxWidth:      720,
            width:        '100%',
            margin:       '0 auto',
            minHeight:     0,
          }}>

            {/* Guide rail — persistent orientation header */}
            <GuideRail
              mode={mode}
              isActive={isActive}
              isPro={isPro}
              usedToday={usedToday}
              useProfileCtx={useProfileCtx}
              businessMode={businessMode}
              hasHistory={profile.sessions.length > 0}
              hasMessages={chatMessages.length > 0 || isComplete}
              contextLabel={contextLabel}
              onModeSelect={(m) => { setMode(m); setShowSovereign(false) }}
              onToggleCtx={toggleProfileCtx}
              onToggleBusiness={() => setBusinessMode(v => !v)}
              onHistory={() => setShowHistory(true)}
              onReset={handleReset}
              onUpgradePro={triggerPaywall}
              hasApiKey={!!apiKey}
              onAddKey={() => setShowKeyPanel(true)}
            />

            {/* Scrollable stage */}
            <ChatStage
              messages={chatMessages}
              onFollowUp={handleFollowUp}
              onModeSelect={(m) => { setMode(m); setShowSovereign(false) }}
              onQuickPick={(text) => { setInput(text); setTimeout(() => textareaRef.current?.focus(), 20) }}
              mode={mode}
              sailState={sailState}
              isActive={isActive}
              isComplete={isComplete}
              response={response as Record<string, unknown> | null}
              upwindState={state}
              sailText={sailText}
              sailPhase={sailPhase}
              sailIntent={sailIntent}
              trimResponse={trimResponse}
              trimPhase={trimPhase}
              catamaranResponse={catamaranResponse}
              catamaranPhase={catamaranPhase}
              synergyText={synergyText}
              synergyPhase={synergyPhase}
              synergyMeta={synergyMeta}
              synergyModes={synergyModes}
              brandName={brandConfig?.aiName ?? brandConfig?.companyName}
              operatorText={operatorText}
              operatorPhase={operatorPhase}
              scenarioText={scenarioText}
              scenarioPhase={scenarioPhase}
              coachState={coachState}
              coachResult={coachResult}
              convHistory={convHistory}
              autoPhase={autoPhase}
              moodGuide={moodGuide}
              autoError={autoError}
              onAutoProceed={(m) => proceedWithMode(m, pendingAutoTextRef.current)}
              onAutoSwitch={(m)  => proceedWithMode(m, pendingAutoTextRef.current)}
              onDismissAutoError={() => { setAutoPhase('idle'); setAutoError(null) }}
              activeAlerts={activeAlerts}
              activeError={activeError ?? null}
              showInlinePaywall={showInlinePaywall}
              onUpgradePro={triggerPaywall}
              onDismissPaywall={() => setShowInlinePaywall(false)}
              onReset={handleReset}
              onExport={() => setShowExport(true)}
            />

            {/* Bottom composer */}
            <ChatComposer
              input={input}
              mode={mode}
              sailState={sailState}
              isActive={isActive}
              isMac={isMac}
              phIdx={phIdx}
              attachment={attachment}
              fileError={fileError}
              autoMode={autoMode}
              isConversing={isConversing}
              convHistory={convHistory}
              textareaRef={textareaRef}
              fileInputRef={fileInputRef}
              onChange={e => { if (e.target.value.length <= MAX) setInput(e.target.value) }}
              onSubmit={() => void handleSubmit()}
              onModeChange={setMode}
              onAutoToggle={() => { setAutoMode(m => !m); setAutoPhase('idle'); setMoodGuide(null); setAutoError(null) }}
              onFileSelect={async (e) => {
                const file = e.target.files?.[0]; if (fileInputRef.current) fileInputRef.current.value = ''
                if (!file) return; setFileError('')
                if (file.size > MAX_FILE_BYTES) { setFileError(t('chat.fileTooLarge').replace('{size}', (file.size / (1024 * 1024)).toFixed(1))); return }
                try { setAttachment(await parseFile(file)) } catch { setFileError(t('chat.fileReadError')) }
              }}
              onAttachClick={() => fileInputRef.current?.click()}
              onRemoveFile={() => { setAttachment(null); setFileError('') }}
              onVoiceTranscript={text => setInput(prev => prev ? `${prev} ${text}` : text)}
              onStartOver={handleReset}
              businessMode={businessMode}
              onToggleBusiness={() => setBusinessMode(v => !v)}
            />
          </div>
        </div>
      </div>

      {/* ── API Key panel ── */}
      <AnimatePresence>
        {showKeyPanel && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:     'fixed',
              bottom:        170,
              right:          24,
              zIndex:         60,
              width:          340,
              padding:        0,
              background:    'linear-gradient(135deg, rgba(201,169,110,0.10) 0%, rgba(8,9,13,0.82) 60%, rgba(20,184,166,0.06) 100%)',
              backdropFilter:'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border:        '1px solid rgba(201,169,110,0.30)',
              borderRadius:   16,
              boxShadow:     '0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,169,110,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
              overflow:      'hidden',
            }}
          >
            {/* Gold header bar */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)' }} />

            <div style={{ padding: '20px 22px 22px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 5px', fontWeight: 700 }}>
                    🔑 Groq API Key Required
                  </p>
                  <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: '#E8EDF3', margin: 0, lineHeight: 1.2 }}>
                    Connect your AI engine
                  </p>
                </div>
                <button
                  onClick={() => setShowKeyPanel(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(232,237,243,0.45)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Steps */}
              <ol style={{ margin: '0 0 16px', padding: '0 0 0 16px', fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: 'rgba(232,237,243,0.55)', lineHeight: 1.7 }}>
                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E', textDecoration: 'none', fontWeight: 600 }}>console.groq.com/keys</a></li>
                <li>Create a free account and generate a key</li>
                <li>Paste it below — stored locally, never sent to our servers</li>
              </ol>

              {/* Input row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: apiKey ? 10 : 0 }}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveApiKey()}
                  placeholder="gsk_…"
                  autoFocus
                  style={{
                    flex: 1, padding: '9px 12px',
                    border: '1px solid rgba(201,169,110,0.30)',
                    borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                    outline: 'none', fontFamily: 'var(--font-mono), monospace',
                    fontSize: 12, color: '#E8EDF3',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(201,169,110,0.60)' }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(201,169,110,0.30)' }}
                />
                <button
                  onClick={saveApiKey}
                  style={{
                    padding: '9px 18px', background: '#C9A96E', color: '#0A0F1E',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, fontWeight: 800,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Save
                </button>
              </div>

              {/* Current key status */}
              {apiKey && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,255,180,0.06)', border: '1px solid rgba(0,255,180,0.15)', borderRadius: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: 'rgba(0,255,180,0.8)' }}>
                    ✓ Key active: gsk_••••{apiKey.slice(-6)}
                  </span>
                  <button
                    onClick={() => { setApiKey(''); setApiKeyInput(''); localStorage.removeItem(API_KEY_STORE); setShowKeyPanel(false) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, color: 'rgba(232,237,243,0.35)', padding: '0 2px' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback FAB */}
      <button
        onClick={() => setShowFeedback(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(8,9,13,0.70)', border: '1px solid rgba(201,169,110,0.22)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.40)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Modals */}
      <PaywallModal open={showPaywall} onClose={closePaywall} />
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
      {response && mode !== 'sail' && mode !== 'trim' && (
        <ExportModal open={showExport} onClose={() => setShowExport(false)} result={response} sector={input.slice(0, 60)} />
      )}

      {/* ── History panel ── */}
      {showHistory && (
        <>
          <div onClick={() => setShowHistory(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(380px, 92vw)',
              background: 'linear-gradient(180deg, rgba(201,169,110,0.08) 0%, rgba(8,9,13,0.88) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderLeft: '1px solid rgba(201,169,110,0.22)',
              boxShadow: '-8px 0 48px rgba(0,0,0,0.40), inset 1px 0 0 rgba(255,255,255,0.05)',
              zIndex: 61,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Gold hairline top */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)', flexShrink: 0 }} />
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(201,169,110,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 300, color: '#E8EDF3', margin: 0 }}>{t('chat.sessionMemoryTitle')}</p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: 'rgba(232,237,243,0.42)', margin: '2px 0 0' }}>{profile.sessions.length} {t(profile.sessions.length === 1 ? 'chat.analysis' : 'chat.analyses')} {t('chat.pastRecorded')}</p>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,169,110,0.20)', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'rgba(232,237,243,0.45)', lineHeight: 1, padding: '4px 8px' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {profile.sessions.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: 'rgba(232,237,243,0.35)', textAlign: 'center', marginTop: 32 }}>{t('chat.noAnalysesYet')}</p>
              ) : (
                [...profile.sessions].reverse().map((s, i) => {
                  const key = s.id ?? String(i); const expanded = expandedSession === key
                  return (
                    <div key={key} onClick={() => setExpandedSession(expanded ? null : key)}
                      style={{
                        padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                        background: expanded ? 'rgba(201,169,110,0.10)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${expanded ? 'rgba(201,169,110,0.35)' : 'rgba(201,169,110,0.14)'}`,
                        borderRadius: 10, transition: 'all 0.18s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, fontWeight: 600, color: '#E8EDF3', margin: '0 0 4px', lineHeight: 1.4, flex: 1 }}>{s.prompt}</p>
                        <span style={{ color: '#C9A96E', fontSize: 10, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: 'rgba(232,237,243,0.50)', margin: '0 0 6px', lineHeight: 1.5 }}>
                        {expanded ? s.summary : `${s.summary?.slice(0, 100) ?? ''}${(s.summary?.length ?? 0) > 100 ? '…' : ''}`}
                      </p>
                      {s.createdAt && (
                        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, color: 'rgba(232,237,243,0.28)', margin: 0 }}>
                          {new Date(s.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      {expanded && (
                        <button onClick={e => { e.stopPropagation(); setInput(s.prompt ?? ''); setShowHistory(false) }}
                          style={{ marginTop: 12, padding: '6px 14px', background: 'rgba(201,169,110,0.10)', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.35)', borderRadius: 6, fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          {t('chat.rerunAnalysis')}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </>
  )
}
