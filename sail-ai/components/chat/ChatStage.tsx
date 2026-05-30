'use client'

/**
 * ChatStage — Scrollable Response Viewport
 * ─────────────────────────────────────────────────────────────────────────────
 * The main content area of the chat. Houses:
 *   • EmptyState (when no messages exist)
 *   • ChatThread (message history)
 *   • All mode-specific response cards
 *   • Swan loader (Upwind THINKING state)
 *   • Error / alert / paywall banners
 *   • Jump-to-bottom FAB
 *
 * Layout: flex-1, overflow-y-auto, 8pt padding
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence }                  from 'framer-motion'
import type { ChatMessage }                          from '@/hooks/useChatMessages'
import type { AnalysisMode }                         from '@/components/ModeSelector'
import type { SailState, AIResponse, ConvMessage }  from '@/hooks/useSailState'
import type { TrimResponse }                         from '@/components/TrimTimelineCard'
import type { CatamaranResponse }                    from '@/types/chat'
import type { SailIntent }                           from '@/lib/intent'
import type { MoodGuideData }                        from '@/components/MoodGuideCard'
import { ChatThread }                                from '@/components/ChatThread'
import { SwanLoader }                                from '@/components/SwanLoader'
import dynamic                                        from 'next/dynamic'
const AbyssLoader = dynamic(
  () => import('@/components/chat/AbyssLoader').then(m => m.AbyssLoader),
  { ssr: false, loading: () => null }
)
import { ExecutiveResponseCard }                     from '@/components/ExecutiveResponseCard'
import { TrimTimelineCard }                          from '@/components/TrimTimelineCard'
import { CatamaranResponseCard }                     from '@/components/CatamaranResponseCard'
import { SynergyResponseCard }                       from '@/components/SynergyResponseCard'
import { SailAdapter }                               from '@/components/SailAdapter'
import { MoodGuideCard }                             from '@/components/MoodGuideCard'
import { PredictiveAlertList }                       from '@/components/PredictiveAlertBanner'
import { EmptyState }                                from '@/components/chat/EmptyState'
import { useLanguage }                               from '@/lib/i18n/LanguageContext'

// ── Mode color map ────────────────────────────────────────────────────────────

const MODE_COLOR: Record<AnalysisMode, string> = {
  upwind:    '#4F8EF7',
  downwind:  '#34D399',
  sail:      '#A78BFA',
  trim:      '#FBA928',
  catamaran: '#FBBF24',
  operator:  '#F87171',
  synergy:   '#C9A96E',
  scenario:  '#38BDF8',
}

// ── Streaming result card wrapper ─────────────────────────────────────────────

function StreamCard({
  mode, streaming, children,
}: {
  mode: AnalysisMode
  streaming: boolean
  children: React.ReactNode
}) {
  const color = MODE_COLOR[mode]
  const labels: Record<AnalysisMode, string> = {
    sail:      'SAIL · Adaptive Intelligence',
    operator:  'OPERATOR · Universal Intelligence',
    scenario:  'SCENARIO · Predictive Simulation',
    synergy:   'SYNERGY · War Room',
    upwind:    'UPWIND · Executive',
    downwind:  'DOWNWIND · Momentum Engine',
    trim:      'TRIM · Timeline',
    catamaran: 'CATAMARAN · Dual Track',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:   'rgba(10,13,20,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border:       `1px solid rgba(201,169,110,0.38)`,
        borderTop:    `2px solid ${color}`,
        borderRadius:  12,
        overflow:     'hidden',
        boxShadow:    `0 4px 28px ${color}14, 0 2px 8px rgba(0,0,0,0.35)`,
      }}
    >
      {/* Card header — stays on dark shell */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:           8,
        padding:      '10px 16px',
        borderBottom: `1px solid ${color}20`,
        background:   `${color}10`,
      }}>
        {streaming && (
          <motion.span
            animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            style={{
              display:      'inline-block',
              width:         6,
              height:        6,
              borderRadius: '50%',
              background:   color,
              flexShrink:   0,
            }}
          />
        )}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       10,
          fontWeight:     700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color,
        }}>
          {labels[mode] ?? mode.toUpperCase()}
        </span>
      </div>
      {/* Card body — dark glass panel for readable content */}
      <div style={{
        background:   'rgba(12,15,24,0.90)',
        margin:       '1px',
        borderRadius: '0 0 11px 11px',
        padding:      '20px 16px',
        color:        '#DDE3EC',
      }}>
        {children}
      </div>
    </motion.div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatStageProps {
  // Thread
  messages:    ChatMessage[]
  onFollowUp:  (text: string) => void
  onModeSelect:(mode: AnalysisMode) => void
  onQuickPick: (text: string) => void

  // Mode state
  mode:      AnalysisMode
  sailState: SailState
  isActive:  boolean
  isComplete:boolean

  // Upwind
  response:  Record<string, unknown> | null
  upwindState: 'IDLE' | 'THINKING' | 'STREAMING' | 'COMPLETE' | 'CONVERSING' | 'ERROR'

  // SAIL
  sailText:  string
  sailPhase: 'idle' | 'streaming' | 'complete'
  sailIntent:SailIntent

  // TRIM
  trimResponse: TrimResponse | null
  trimPhase:    'idle' | 'loading' | 'complete'

  // CATAMARAN
  catamaranResponse: CatamaranResponse | null
  catamaranPhase:    'idle' | 'loading' | 'complete'

  // SYNERGY
  synergyText:  string
  synergyPhase: 'idle' | 'streaming' | 'complete'
  synergyMeta:  { modes: string[]; companyName: string | null } | null
  synergyModes: AnalysisMode[]
  brandName?:   string

  // OPERATOR
  operatorText:  string
  operatorPhase: 'idle' | 'streaming' | 'complete'

  // SCENARIO
  scenarioText:  string
  scenarioPhase: 'idle' | 'streaming' | 'complete'

  // DOWNWIND
  coachState:   SailState
  coachResult:  AIResponse | null
  convHistory:  ConvMessage[]

  // AUTO
  autoPhase:  'idle' | 'routing' | 'guiding' | 'error'
  moodGuide:  MoodGuideData | null
  autoError:  string | null
  onAutoProceed:(mode: string) => void
  onAutoSwitch: (mode: string) => void
  onDismissAutoError: () => void

  // Alerts + errors
  activeAlerts:       unknown[]
  activeError:        string | null
  showInlinePaywall:  boolean
  onUpgradePro:       () => void
  onDismissPaywall:   () => void

  // CTA
  onReset:  () => void
  onExport: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatStage(props: ChatStageProps) {
  const {
    messages, onFollowUp, onModeSelect, onQuickPick,
    mode, isActive, isComplete,
    response, upwindState,
    sailText, sailPhase, sailIntent,
    trimResponse, trimPhase,
    catamaranResponse, catamaranPhase,
    synergyText, synergyPhase, synergyMeta, synergyModes, brandName,
    operatorText, operatorPhase,
    scenarioText, scenarioPhase,
    coachState, coachResult, convHistory,
    autoPhase, moodGuide, autoError, onAutoProceed, onAutoSwitch, onDismissAutoError,
    activeAlerts, activeError, showInlinePaywall, onUpgradePro, onDismissPaywall,
    onReset, onExport,
  } = props

  const { t } = useLanguage()
  const scrollRef  = useRef<HTMLDivElement>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const [showFab, setShowFab] = useState(false)

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isActive, sailPhase, trimPhase, catamaranPhase, synergyPhase, operatorPhase, scenarioPhase, upwindState, coachState])

  // Show "jump to bottom" FAB when scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowFab(distFromBottom > 200)
  }, [])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const hasAnyContent = messages.length > 0
    || (mode === 'sail'      && sailPhase      !== 'idle')
    || (mode === 'trim'      && trimPhase      !== 'idle')
    || (mode === 'catamaran' && catamaranPhase !== 'idle')
    || (mode === 'synergy'   && synergyPhase   !== 'idle')
    || (mode === 'operator'  && operatorPhase  !== 'idle')
    || (mode === 'scenario'  && scenarioPhase  !== 'idle')
    || (mode === 'upwind'    && upwindState    !== 'IDLE')
    || (mode === 'downwind'  && coachState     !== 'IDLE')
    || autoPhase !== 'idle'

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        flex:       1,
        overflowY:  'auto',
        overflowX:  'hidden',
        position:   'relative',
      }}
    >
      <div style={{
        maxWidth:  672,
        margin:    '0 auto',
        padding:   '24px 24px 32px',
        display:   'flex',
        flexDirection: 'column',
        gap:        16,
        minHeight: '100%',
      }}>

        {/* ── Empty state ── */}
        {!hasAnyContent && (
          <EmptyState
            onModeSelect={onModeSelect}
            onQuickPick={onQuickPick}
          />
        )}

        {/* ── Drift alerts ── */}
        <AnimatePresence>
          {(activeAlerts as { id: string }[]).length > 0 && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PredictiveAlertList alerts={activeAlerts as never} variant="light" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Inline paywall ── */}
        <AnimatePresence>
          {showInlinePaywall && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding:       '16px 20px',
                background:    'rgba(10,13,20,0.94)',
                backdropFilter:'blur(24px)',
                border:        '1px solid rgba(201,169,110,0.32)',
                borderLeft:    '3px solid #C9A96E',
                borderRadius:   12,
                display:       'flex',
                alignItems:    'flex-start',
                justifyContent:'space-between',
                gap:            12,
                boxShadow:     '0 4px 24px rgba(201,169,110,0.10)',
              }}
            >
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#C9A96E', margin: '0 0 4px' }}>
                  {t('paywall.inlineTitle')}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(232,237,243,0.55)', margin: 0, lineHeight: 1.5 }}>
                  {t('paywall.inlineCta')}
                </p>
              </div>
              <button
                onClick={() => { onDismissPaywall(); onUpgradePro() }}
                style={{
                  padding:       '8px 16px',
                  background:    'rgba(10,13,20,0.90)',
                  color:         '#C9A96E',
                  border:        '1px solid rgba(201,169,110,0.40)',
                  borderRadius:   8,
                  fontFamily:    'Inter, sans-serif',
                  fontSize:       11,
                  fontWeight:     700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  flexShrink:    0,
                }}
              >
                Upgrade →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error state ── */}
        <AnimatePresence>
          {activeError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding:       '14px 16px',
                display:       'flex',
                alignItems:    'flex-start',
                gap:            12,
                background:    'rgba(10,13,20,0.92)',
                backdropFilter:'blur(24px)',
                border:        '1px solid rgba(248,113,113,0.22)',
                borderLeft:    '3px solid #F87171',
                borderRadius:   12,
                boxShadow:     '0 2px 8px rgba(248,113,113,0.08)',
              }}
            >
              <span style={{ color: '#F87171', flexShrink: 0 }}>⚠</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.6, color: 'rgba(248,113,113,0.90)', margin: 0 }}>
                {activeError === 'RATE_LIMIT'
                  ? 'Request limit reached. Please wait a moment before trying again.'
                  : activeError?.toLowerCase().includes('sign in') || activeError?.toLowerCase().includes('unauthorized')
                  ? <span>Session expired. <a href="/login?callbackUrl=%2Fchat" style={{ color: '#F87171', textDecoration: 'underline' }}>Sign in again →</a></span>
                  : activeError
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AUTO / MoodGuide ── */}
        <AnimatePresence>
          {(autoPhase === 'routing' || autoPhase === 'guiding') && (
            <motion.div
              key="mood-guide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              <MoodGuideCard
                data={moodGuide ?? {
                  detectedMood: 'analytical', selectedMode: 'upwind',
                  alternativeMode: 'sail', reasoning: '',
                  urgencyLevel: 0.3, confidence: 0.7, autoProceeding: false,
                }}
                phase={autoPhase}
                onProceed={onAutoProceed}
                onSwitch={onAutoSwitch}
              />
            </motion.div>
          )}
          {autoPhase === 'error' && autoError && (
            <motion.div
              key="auto-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ padding: '12px 16px', background: 'rgba(10,13,20,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(248,113,113,0.22)', borderLeft: '3px solid #F87171', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ color: '#F87171' }}>⚠</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(248,113,113,0.88)', flex: 1 }}>{autoError}</span>
              <button
                onClick={onDismissAutoError}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#F87171', background: 'none', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat thread (multi-turn messages) ── */}
        {messages.length > 0 && (
          <ChatThread messages={messages} onFollowUp={onFollowUp} />
        )}

        {/* ── Abyss loader — non-upwind modes while waiting for first token ── */}
        <AnimatePresence>
          {(
            (mode === 'sail'      && sailPhase      === 'streaming' && !sailText) ||
            (mode === 'trim'      && trimPhase      === 'loading'               ) ||
            (mode === 'catamaran' && catamaranPhase === 'loading'               ) ||
            (mode === 'synergy'   && synergyPhase   === 'streaming' && !synergyText) ||
            (mode === 'operator'  && operatorPhase  === 'streaming' && !operatorText) ||
            (mode === 'scenario'  && scenarioPhase  === 'streaming' && !scenarioText)
          ) && (
            <motion.div
              key="abyss-general"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
            >
              <AbyssLoader
                modeLabel={mode.charAt(0).toUpperCase() + mode.slice(1)}
                isActive
                isComplete={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SAIL ── */}
        <AnimatePresence>
          {mode === 'sail' && (sailPhase === 'streaming' || sailPhase === 'complete') && (
            <StreamCard key="sail" mode="sail" streaming={sailPhase === 'streaming'}>
              <SailAdapter text={sailText} intent={sailIntent} streaming={sailPhase === 'streaming'} />
            </StreamCard>
          )}
        </AnimatePresence>

        {/* ── TRIM ── */}
        <AnimatePresence>
          {mode === 'trim' && (trimPhase === 'loading' || trimPhase === 'complete') && (
            <motion.div key="trim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
              <div style={{
                background:   'rgba(10,13,20,0.92)', backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border:       '1px solid rgba(201,169,110,0.38)', borderTop: '2px solid #B45309',
                borderRadius:  12, overflow: 'hidden',
                boxShadow:    '0 4px 28px rgba(180,83,9,0.14), 0 2px 8px rgba(0,0,0,0.35)',
              }}>
                <div style={{ background: 'rgba(12,15,24,0.90)', margin: '1px', borderRadius: '0 0 11px 11px', padding: 24, color: '#DDE3EC' }}>
                  <TrimTimelineCard response={trimResponse} isLoading={trimPhase === 'loading'} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CATAMARAN ── */}
        <AnimatePresence>
          {mode === 'catamaran' && (catamaranPhase === 'loading' || catamaranPhase === 'complete') && (
            <motion.div key="catamaran" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
              <CatamaranResponseCard response={catamaranResponse} isStreaming={catamaranPhase === 'loading'} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SYNERGY ── */}
        <AnimatePresence>
          {mode === 'synergy' && (synergyPhase === 'streaming' || synergyPhase === 'complete') && (
            <motion.div key="synergy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
              <SynergyResponseCard
                text={synergyText}
                streaming={synergyPhase === 'streaming'}
                modes={synergyMeta?.modes ?? (synergyModes as string[])}
                companyName={synergyMeta?.companyName ?? brandName ?? undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── OPERATOR ── */}
        <AnimatePresence>
          {mode === 'operator' && (operatorPhase === 'streaming' || operatorPhase === 'complete') && (
            <StreamCard key="operator" mode="operator" streaming={operatorPhase === 'streaming'}>
              <SailAdapter text={operatorText} intent="analytic" streaming={operatorPhase === 'streaming'} />
            </StreamCard>
          )}
        </AnimatePresence>

        {/* ── SCENARIO ── */}
        <AnimatePresence>
          {mode === 'scenario' && (scenarioPhase === 'streaming' || scenarioPhase === 'complete') && (
            <StreamCard key="scenario" mode="scenario" streaming={scenarioPhase === 'streaming'}>
              <SailAdapter text={scenarioText} intent="scenario" streaming={scenarioPhase === 'streaming'} />
            </StreamCard>
          )}
        </AnimatePresence>

        {/* ── UPWIND: Abyss loader + ExecutiveResponseCard ── */}
        <AnimatePresence mode="wait">
          {mode === 'upwind' && upwindState === 'THINKING' && (
            <motion.div
              key="abyss-upwind"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4 }}
            >
              <AbyssLoader
                modeLabel="Upwind"
                isActive
                isComplete={false}
              />
            </motion.div>
          )}
          {mode === 'upwind' && upwindState === 'COMPLETE' && (
            <motion.div
              key="upwind-result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ExecutiveResponseCard
                response={response as never}
                isStreaming={false}
                variant="dark"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DOWNWIND ── */}
        <AnimatePresence>
          {mode === 'downwind' && coachState !== 'IDLE' && coachState !== 'ERROR' && (
            <motion.div key="downwind" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
              <div style={{
                background:   'rgba(10,13,20,0.92)', backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border:       '1px solid rgba(201,169,110,0.38)', borderTop: '2px solid #059669',
                borderRadius:  12, overflow: 'hidden',
                boxShadow:    '0 4px 28px rgba(5,150,105,0.14), 0 2px 8px rgba(0,0,0,0.35)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(5,150,105,0.20)', background: 'rgba(5,150,105,0.10)' }}>
                  {(coachState === 'THINKING' || coachState === 'STREAMING') && (
                    <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00695C', flexShrink: 0 }} />
                  )}
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00695C' }}>
                    Downwind · Momentum Engine
                  </span>
                  {convHistory.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(0,105,92,0.5)' }}>
                      {Math.floor(convHistory.length / 2)} turn{convHistory.length > 2 ? 's' : ''}
                    </span>
                  )}
                </div>
                {/* Body */}
                <div style={{ padding: '20px 16px' }}>
                  {(coachState === 'THINKING' || coachState === 'STREAMING') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ width: 28, height: 3, borderRadius: 2, background: 'rgba(0,105,92,0.25)' }} />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                        style={{ width: 20, height: 3, borderRadius: 2, background: 'rgba(0,105,92,0.18)' }} />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#C9A96E', marginLeft: 4 }}>Analyzing strategic drift…</span>
                    </div>
                  )}
                  {(coachState === 'CONVERSING' || coachState === 'COMPLETE') && coachResult && (
                    <div>
                      {'chatMessage' in coachResult && (
                        <div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.75, color: '#C9A96E', margin: 0 }}>
                            {coachResult.chatMessage}
                          </p>
                          {coachResult.followUpQuestion && (
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.65, color: '#00695C', margin: '14px 0 0', fontStyle: 'italic', paddingLeft: 12, borderLeft: '2px solid rgba(0,105,92,0.3)' }}>
                              {coachResult.followUpQuestion}
                            </p>
                          )}
                        </div>
                      )}
                      {'headline' in coachResult && (
                        <div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#C9A96E', margin: '0 0 8px', lineHeight: 1.5 }}>{coachResult.headline}</p>
                          {'signal' in coachResult && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#D4B980', margin: 0, lineHeight: 1.6 }}>{coachResult.signal}</p>}
                        </div>
                      )}
                      {'question' in coachResult && (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#00695C', margin: 0, fontStyle: 'italic', lineHeight: 1.7 }}>{coachResult.question}</p>
                      )}
                      {'freeText' in coachResult && (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.75, color: '#C9A96E', margin: 0 }}>{coachResult.freeText}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 8 }}
            >
              <button
                onClick={onReset}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:            8,
                  padding:       '8px 20px',
                  background:    'rgba(255,255,255,0.06)',
                  backdropFilter:'blur(20px)',
                  border:        '1px solid rgba(255,255,255,0.12)',
                  borderRadius:   8,
                  cursor:        'pointer',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:       12,
                  fontWeight:     600,
                  letterSpacing: '0.06em',
                  color:         'rgba(232,237,243,0.75)',
                  transition:    'all 0.15s',
                }}
              >
                ↺ New Topic
              </button>
              <button
                onClick={onExport}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:            6,
                  padding:       '8px 16px',
                  background:    'transparent',
                  border:        '1px solid rgba(201,169,110,0.4)',
                  borderRadius:   8,
                  cursor:        'pointer',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:       11,
                  fontWeight:     700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color:         '#C9A96E',
                  transition:    'all 0.15s',
                }}
              >
                ↓ Export
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Jump to bottom FAB ── */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={scrollToBottom}
            style={{
              position:       'fixed',
              bottom:          160,
              right:           24,
              zIndex:          20,
              width:           40,
              height:          40,
              borderRadius:   '50%',
              background:     'rgba(10,13,20,0.92)',
              backdropFilter: 'blur(20px)',
              border:         '1px solid rgba(201,169,110,0.40)',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 4px 16px rgba(0,0,0,0.35)',
            }}
            aria-label="Jump to bottom"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
