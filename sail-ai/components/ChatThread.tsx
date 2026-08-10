'use client'

/**
 * ChatThread — Clean White Chat Bubbles
 * ─────────────────────────────────────────────────────────────────────────────
 * UserBubble:     white card, dark text, mode-color subtle left accent
 * AssistantCard:  white card, thin top border in mode color, dark readable text
 */

import { memo, useMemo } from 'react'
import { motion, AnimatePresence }                      from 'framer-motion'
import type { ChatMessage }                             from '@/hooks/useChatMessages'
import type { AnalysisMode }                            from '@/components/ModeSelector'
import { SailAdapter, extractSuggestedQuestions }       from '@/components/SailAdapter'
import { ExecutiveResponseCard }                        from '@/components/ExecutiveResponseCard'
import { TrimTimelineCard }                             from '@/components/TrimTimelineCard'
import { CatamaranResponseCard }                        from '@/components/CatamaranResponseCard'
import { SynergyResponseCard }                          from '@/components/SynergyResponseCard'
import { StreamingCursor }                              from '@/components/chat/StreamingCursor'

// ── Design tokens ──────────────────────────────────────────────────────────────

const MODE_META: Record<AnalysisMode, { label: string; color: string }> = {
  upwind:    { label: 'Upwind',    color: '#2563EB' },
  downwind:  { label: 'Downwind',  color: '#059669' },
  sail:      { label: 'SAIL',      color: '#7C3AED' },
  trim:      { label: 'TRIM',      color: '#B45309' },
  catamaran: { label: 'Catamaran', color: '#D97706' },
  operator:  { label: 'Operator',  color: '#DC2626' },
  synergy:   { label: 'Synergy',   color: '#C9A96E' },
  scenario:  { label: 'Scenario',  color: '#0891B2' },
}

// Fallback chips used only for JSON-schema modes (trim/catamaran/upwind/downwind)
// where the AI returns structured data and cannot embed a ## Suggested Questions block.
// Text-streaming modes (sail/operator/scenario/synergy/personalised) generate
// contextual questions dynamically via CONTEXTUAL_FOLLOWUP_DIRECTIVE in the prompt.
const FALLBACK_FOLLOW_UPS: Record<AnalysisMode, string[]> = {
  upwind:    ['What are the biggest execution risks?', 'How should we prioritize these steps?', 'Build a 90-day milestone roadmap.'],
  downwind:  ['How do I overcome the main obstacle?', 'What metrics should I track?', 'Give me a one-week action list.'],
  sail:      [],
  trim:      ['Which milestone is most at risk?', 'Who should own each milestone?', 'Add contingency buffers to the critical path.'],
  catamaran: ['How do we balance both tracks?', 'What if we focus only on Track A first?', 'Build the resource allocation plan.'],
  operator:  [],
  synergy:   [],
  scenario:  [],
}

// ── User bubble ────────────────────────────────────────────────────────────────

const UserBubble = memo(function UserBubble({ message }: { message: ChatMessage }) {
  const text      = message.payload.type === 'text' ? message.payload.text : ''
  const ts        = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const modeLabel = MODE_META[message.mode]?.label ?? message.mode
  const color     = MODE_META[message.mode]?.color ?? '#14B8A6'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: 48 }}
    >
      <div style={{ maxWidth: '84%' }}>
        <div style={{
          background:    `linear-gradient(135deg, ${color}18 0%, rgba(8,9,13,0.75) 100%)`,
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          borderRadius:  '16px 16px 4px 16px',
          padding:       '12px 16px',
          boxShadow:     `0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)`,
          border:        `1px solid ${color}30`,
          borderLeft:    `3px solid ${color}`,
        }}>
          <p style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       14,
            fontWeight:     400,
            lineHeight:     1.65,
            letterSpacing: '-0.01em',
            color:         'rgba(255,255,255,0.92)',
            margin:         0,
            whiteSpace:    'pre-wrap',
            wordBreak:     'break-word',
          }}>
            {text}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, opacity: 0.8 }}>
            {modeLabel}
          </span>
          <span suppressHydrationWarning style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.02em' }}>
            {ts}
          </span>
        </div>
      </div>
    </motion.div>
  )
})

// ── Assistant card ─────────────────────────────────────────────────────────────

const AssistantCard = memo(function AssistantCard({
  message,
  onFollowUp,
}: {
  message:    ChatMessage
  onFollowUp: (text: string) => void
}) {
  const meta = MODE_META[message.mode] ?? MODE_META.upwind
  const ts   = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Dynamic chips: extract AI-generated follow-up questions from the response text.
  // Falls back to static mode chips for JSON modes (trim/catamaran/upwind/downwind)
  // which return structured data and cannot embed a ## Suggested Questions block.
  const chips = useMemo(() => {
    if (message.streaming) return FALLBACK_FOLLOW_UPS[message.mode] ?? []
    if (message.payload.type === 'text' && message.payload.text) {
      const dynamic = extractSuggestedQuestions(message.payload.text)
      if (dynamic.length >= 2) return dynamic
    }
    return FALLBACK_FOLLOW_UPS[message.mode] ?? []
  }, [message.streaming, message.payload, message.mode])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ paddingRight: 16 }}
    >
      {/* Mode header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
        <motion.span
          animate={message.streaming
            ? { opacity: [1, 0.15, 1], scale: [1, 0.65, 1] }
            : { opacity: 0.7, scale: 1 }}
          transition={{ duration: 1.1, repeat: message.streaming ? Infinity : 0 }}
          style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: meta.color, flexShrink: 0,
            boxShadow: message.streaming ? `0 0 8px ${meta.color}88` : 'none',
          }}
        />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: meta.color }}>
          {meta.label}
        </span>
        <span suppressHydrationWarning style={{
          fontFamily: 'Inter, sans-serif', fontSize: 10,
          color: message.streaming ? meta.color : 'rgba(255,255,255,0.35)',
          fontStyle: message.streaming ? 'italic' : 'normal', letterSpacing: '0.02em',
        }}>
          {message.streaming ? '· Processing…' : `· ${ts}`}
        </span>
      </div>

      <div style={{
        background:   `linear-gradient(135deg, ${meta.color}10 0%, rgba(8,9,13,0.80) 60%, rgba(20,184,166,0.04) 100%)`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border:       `1px solid ${meta.color}28`,
        borderTop:    `2px solid ${meta.color}`,
        borderRadius: '4px 16px 16px 16px',
        overflow:     'hidden',
        boxShadow:    `0 4px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)`,
      }}>
        <div style={{ color: '#FFFFFF' }}>
          {renderPayload(message)}

          {/* Streaming cursor */}
          {message.streaming && message.payload.type === 'text' && message.payload.text && (
            <div style={{ paddingBottom: 16, paddingLeft: 20 }}>
              <StreamingCursor streaming />
            </div>
          )}
        </div>
      </div>

      {/* Follow-up chips — mint glass */}
      {!message.streaming && message.payload.type !== 'error' && chips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.25 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 4, alignItems: 'center' }}
        >
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
            Continue →
          </span>
          {chips.slice(0, 2).map((chip, i) => (
            <motion.button
              key={chip}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.2 }}
              onClick={() => onFollowUp(chip)}
              style={{
                padding:        '5px 12px',
                background:     'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                border:         `1px solid ${meta.color}40`,
                borderRadius:    9999,
                fontFamily:     'Inter, sans-serif',
                fontSize:        11,
                fontWeight:      500,
                color:           meta.color,
                cursor:         'pointer',
                lineHeight:      1.4,
                letterSpacing:  '0.01em',
                boxShadow:      `0 0 10px ${meta.color}14`,
                transition:     'all 0.18s',
              }}
            >
              {chip}
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
})

// ── Payload renderer ──────────────────────────────────────────────────────────

function renderPayload(message: ChatMessage) {
  const { payload, mode, streaming } = message

  switch (payload.type) {
    case 'error':
      return (
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ color: '#F87171', flexShrink: 0 }}>⚠</span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(248,113,113,0.88)', margin: 0, lineHeight: 1.55 }}>
            {payload.message}
          </p>
        </div>
      )

    case 'executive':
      return (
        <ExecutiveResponseCard
          response={payload.data as never}
          isStreaming={streaming}
          variant="dark"
        />
      )

    case 'trim':
      return (
        <div style={{ padding: 20 }}>
          <TrimTimelineCard response={payload.data} isLoading={streaming} />
        </div>
      )

    case 'catamaran':
      return (
        <CatamaranResponseCard response={payload.data} isStreaming={streaming} />
      )

    case 'text':
    default: {
      const intent = mode === 'scenario' ? 'scenario' as const : 'analytic' as const

      if (mode === 'sail') {
        return (
          <div style={{ padding: '20px 20px 16px' }}>
            <SailAdapter text={payload.text} intent={intent} streaming={streaming} />
          </div>
        )
      }
      if (mode === 'synergy') {
        return (
          <SynergyResponseCard
            text={payload.text}
            streaming={streaming}
            modes={['sail', 'upwind']}
          />
        )
      }
      return (
        <div style={{ padding: '20px 20px 16px' }}>
          {streaming && !payload.text && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.4, repeat: Infinity }}
                style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.18 }}
                style={{ width: 24, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.10)' }} />
              <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.36 }}
                style={{ width: 16, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }} />
            </div>
          )}
          {payload.text && (
            <SailAdapter text={payload.text} intent={intent} streaming={streaming} />
          )}
        </div>
      )
    }
  }
}

// ── Main thread component ──────────────────────────────────────────────────────

interface ChatThreadProps {
  messages:   ChatMessage[]
  onFollowUp: (text: string, mode?: AnalysisMode) => void
  className?: string
}

export function ChatThread({ messages, onFollowUp, className }: ChatThreadProps) {
  if (messages.length === 0) return null

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {messages.map(msg => (
        msg.role === 'user'
          ? <UserBubble key={msg.id} message={msg} />
          : <AssistantCard
              key={msg.id}
              message={msg}
              onFollowUp={text => onFollowUp(text, msg.mode)}
            />
      ))}
    </div>
  )
}
