'use client'

/**
 * components/ChatThread.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Continuous, infinite-scroll conversation thread for Sail AI.
 *
 * Features:
 *   • Auto-scrolls to latest message on every append
 *   • User messages render as right-aligned bubbles
 *   • Assistant messages render their native card per mode
 *   • Streaming indicator (animated gold dot + text)
 *   • Follow-up question chips below each completed response
 *   • "Jump to bottom" FAB when user has scrolled up
 *   • Timestamps on hover
 *
 * The component is intentionally display-only — it receives messages and
 * fires callbacks; all state lives in useChatMessages.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage }        from '@/hooks/useChatMessages'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { SailAdapter }             from '@/components/SailAdapter'
import { ExecutiveResponseCard }   from '@/components/ExecutiveResponseCard'
import { TrimTimelineCard }        from '@/components/TrimTimelineCard'
import { CatamaranResponseCard }   from '@/components/CatamaranResponseCard'
import { SynergyResponseCard }     from '@/components/SynergyResponseCard'

// ── Mode meta ─────────────────────────────────────────────────────────────────

const MODE_META: Record<AnalysisMode, { label: string; color: string; bg: string }> = {
  upwind:    { label: 'Upwind',         color: '#1A5276', bg: 'rgba(26,82,118,0.06)'   },
  downwind:  { label: 'Downwind',       color: '#00695C', bg: 'rgba(0,105,92,0.06)'    },
  sail:      { label: 'SAIL',           color: '#7C3AED', bg: 'rgba(124,58,237,0.06)'  },
  trim:      { label: 'TRIM',           color: '#B45309', bg: 'rgba(201,169,110,0.06)' },
  catamaran: { label: 'Catamaran',      color: '#D4AF37', bg: 'rgba(212,175,55,0.06)'  },
  operator:  { label: 'Operator',       color: '#CC2200', bg: 'rgba(204,34,0,0.06)'    },
  synergy:   { label: 'Synergy',        color: '#C9A96E', bg: 'rgba(201,169,110,0.06)' },
  scenario:  { label: 'Scenario',       color: '#00C9B1', bg: 'rgba(0,201,177,0.06)'   },
}

// ── Follow-up question chips per mode ─────────────────────────────────────────

const FOLLOW_UPS: Record<AnalysisMode, string[]> = {
  upwind:    [
    'What are the biggest execution risks in this plan?',
    'How should we prioritize these action steps?',
    'Build a 90-day milestone roadmap for this.',
  ],
  downwind:  [
    'How do I overcome the main obstacle you identified?',
    'What metrics should I track to stay on course?',
    'Give me a one-week action list.',
  ],
  sail:      [
    'Drill deeper into the highest-impact insight.',
    'What competitive threats should I monitor?',
    'Turn this into a board-ready executive summary.',
  ],
  trim:      [
    'Which milestone is most at risk of slipping?',
    'Who should own each of these milestones?',
    'Add contingency buffers to the critical path.',
  ],
  catamaran: [
    'How do we balance both tracks simultaneously?',
    'What happens if we focus only on Track A first?',
    'Build the resource allocation plan.',
  ],
  operator:  [
    'Give me the next 3 tactical moves right now.',
    'What is the highest-leverage action this week?',
    'Identify the single biggest constraint.',
  ],
  synergy:   [
    "Which mode's perspective is most critical here?",
    'Where do the modes disagree and why?',
    'Synthesise all perspectives into one action.',
  ],
  scenario:  [
    'What is the worst-case scenario probability?',
    'How do I hedge against the downside?',
    'Run the bull-case scenario instead.',
  ],
}

// ── User message bubble ───────────────────────────────────────────────────────

const UserBubble = memo(function UserBubble({ message }: { message: ChatMessage }) {
  const text = message.payload.type === 'text' ? message.payload.text : ''
  const ts   = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22 }}
      style={{
        display:        'flex',
        justifyContent: 'flex-end',
        paddingLeft:    '3rem',
      }}
    >
      <div style={{ maxWidth: '80%' }}>
        <div style={{
          background:   'linear-gradient(135deg, #0C0C0E 0%, #1A1A22 100%)',
          borderRadius: '14px 14px 4px 14px',
          padding:      '0.75rem 1rem',
          boxShadow:    '0 2px 8px rgba(0,0,0,0.15)',
          position:     'relative',
        }}>
          {/* Gold accent line */}
          <div style={{
            position:   'absolute',
            top:        0,
            left:       '15%',
            right:      '15%',
            height:     '1px',
            background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)',
          }} />
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '0.875rem',
            lineHeight: 1.65,
            color:      '#F4F4F5',
            margin:     0,
            whiteSpace: 'pre-wrap',
            wordBreak:  'break-word',
          }}>
            {text}
          </p>
        </div>
        <div style={{
          display:        'flex',
          justifyContent: 'flex-end',
          gap:            '0.4rem',
          marginTop:      '0.2rem',
          alignItems:     'center',
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#C4C4CC' }}>
            {ts}
          </span>
          {/* Mode pill */}
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.52rem',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         MODE_META[message.mode]?.color ?? '#C9A96E',
            background:    MODE_META[message.mode]?.bg ?? 'rgba(201,169,110,0.06)',
            padding:       '1px 6px',
            borderRadius:  '3px',
          }}>
            {MODE_META[message.mode]?.label ?? message.mode}
          </span>
        </div>
      </div>
    </motion.div>
  )
})

// ── Assistant response card ───────────────────────────────────────────────────

const AssistantCard = memo(function AssistantCard({
  message,
  onFollowUp,
}: {
  message:     ChatMessage
  onFollowUp:  (text: string) => void
}) {
  const meta  = MODE_META[message.mode] ?? MODE_META.upwind
  const chips = FOLLOW_UPS[message.mode] ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ paddingRight: '1.5rem' }}
    >
      {/* Mode header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '0.5rem',
        marginBottom:  '0.5rem',
        paddingLeft:   '0.25rem',
      }}>
        {message.streaming && (
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              display:      'inline-block',
              width:         6,
              height:        6,
              borderRadius: '50%',
              background:   meta.color,
              flexShrink:   0,
            }}
          />
        )}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.58rem',
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         meta.color,
        }}>
          {meta.label} · {message.streaming ? 'Analysing…' : 'Intelligence'}
        </span>
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '0.56rem',
          color:      '#C4C4CC',
          marginLeft: 'auto',
        }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Response body — mode-specific */}
      <div style={{
        background:   '#FFFFFF',
        border:       `1px solid ${meta.color}22`,
        borderRadius: '4px 14px 14px 14px',
        overflow:     'hidden',
        boxShadow:    `0 2px 16px ${meta.color}0a, 0 1px 4px rgba(0,0,0,0.04)`,
      }}>
        {renderPayload(message)}
      </div>

      {/* Follow-up chips — only when complete */}
      {!message.streaming && message.payload.type !== 'error' && chips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.2 }}
          style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        '0.35rem',
            marginTop:  '0.625rem',
            paddingLeft:'0.25rem',
          }}
        >
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#C4C4CC', alignSelf: 'center', letterSpacing: '0.04em' }}>
            Continue →
          </span>
          {chips.slice(0, 2).map(chip => (
            <button
              key={chip}
              onClick={() => onFollowUp(chip)}
              style={{
                padding:      '0.25rem 0.625rem',
                background:   `${meta.color}0d`,
                border:       `1px solid ${meta.color}33`,
                borderRadius: '999px',
                fontFamily:   'Inter, sans-serif',
                fontSize:     '0.68rem',
                color:        meta.color,
                cursor:       'pointer',
                transition:   'all 0.15s',
                lineHeight:   1.4,
              }}
            >
              {chip}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
})

/** Render the correct card component based on payload type. */
function renderPayload(message: ChatMessage) {
  const { payload, mode, streaming } = message

  switch (payload.type) {
    case 'error':
      return (
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ color: '#991B1B', fontSize: '0.85rem' }}>⚠</span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
            {payload.message}
          </p>
        </div>
      )

    case 'executive':
      return (
        <div style={{ padding: '0' }}>
          <ExecutiveResponseCard
            response={payload.data as never}
            isStreaming={streaming}
            variant="light"
          />
        </div>
      )

    case 'trim':
      return (
        <div style={{ padding: '1.25rem' }}>
          <TrimTimelineCard response={payload.data} isLoading={streaming} />
        </div>
      )

    case 'catamaran':
      return (
        <CatamaranResponseCard
          response={payload.data}
          isStreaming={streaming}
        />
      )

    case 'text':
    default: {
      const intent = mode === 'operator' ? 'analytic' as const
        : mode === 'scenario' ? 'scenario' as const
        : 'analytic' as const

      if (mode === 'sail') {
        return (
          <div style={{ padding: '1.25rem 1.25rem' }}>
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
      // downwind, operator, scenario, generic
      return (
        <div style={{ padding: '1.25rem' }}>
          {streaming && !payload.text && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: 28, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }} style={{ width: 20, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.08)' }} />
            </div>
          )}
          <SailAdapter text={payload.text} intent={intent} streaming={streaming} />
        </div>
      )
    }
  }
}

// ── Main ChatThread component ─────────────────────────────────────────────────

interface ChatThreadProps {
  messages:    ChatMessage[]
  onFollowUp:  (text: string, mode?: AnalysisMode) => void
  className?:  string
}

export function ChatThread({ messages, onFollowUp, className }: ChatThreadProps) {
  const scrollRef      = useRef<HTMLDivElement>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)

  // Auto-scroll on new messages
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, atBottom])

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distFromBottom < 80)
  }, [])

  if (messages.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={className}
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           '1.25rem',
          paddingBottom: '0.5rem',
        }}
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
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Jump to bottom FAB */}
      <AnimatePresence>
        {!atBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              position:       'sticky',
              bottom:         '1rem',
              left:           '50%',
              transform:      'translateX(-50%)',
              display:        'flex',
              alignItems:     'center',
              gap:            '0.35rem',
              padding:        '0.4rem 1rem',
              background:     '#0C0C0E',
              border:         '1px solid rgba(201,169,110,0.35)',
              borderRadius:   '999px',
              cursor:         'pointer',
              boxShadow:      '0 4px 16px rgba(0,0,0,0.2)',
              fontFamily:     'Inter, sans-serif',
              fontSize:       '0.65rem',
              fontWeight:     600,
              letterSpacing:  '0.06em',
              color:          '#C9A96E',
              zIndex:         10,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
            Latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
