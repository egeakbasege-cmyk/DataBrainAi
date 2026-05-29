'use client'

/**
 * components/ChatThread.tsx — Swiss Precision Rebuild
 * ─────────────────────────────────────────────────────────────────────────────
 * Continuous multi-turn conversation thread.
 *
 * Design pillars:
 *   • 8pt grid throughout — all spacing in multiples of 4/8px
 *   • 4-level typography: LABEL / BODY / SUBHEAD / DISPLAY
 *   • UserBubble: right-aligned, deep navy (#0C1929), 16px radius
 *   • AssistantCard: left-aligned, glass surface, mode-color 2px top border
 *   • StreamingCursor: teal blinking I-beam
 *   • FollowUpRail: chips staggered in 0.5s after completion
 */

import { useRef, useState, useCallback, memo } from 'react'
import { motion, AnimatePresence }             from 'framer-motion'
import type { ChatMessage }                    from '@/hooks/useChatMessages'
import type { AnalysisMode }                   from '@/components/ModeSelector'
import { SailAdapter }                         from '@/components/SailAdapter'
import { ExecutiveResponseCard }               from '@/components/ExecutiveResponseCard'
import { TrimTimelineCard }                    from '@/components/TrimTimelineCard'
import { CatamaranResponseCard }               from '@/components/CatamaranResponseCard'
import { SynergyResponseCard }                 from '@/components/SynergyResponseCard'
import { StreamingCursor }                     from '@/components/chat/StreamingCursor'

// ── Design tokens ──────────────────────────────────────────────────────────────

const MODE_META: Record<AnalysisMode, { label: string; color: string }> = {
  upwind:    { label: 'Upwind',    color: '#0F6CBD' },
  downwind:  { label: 'Downwind',  color: '#00695C' },
  sail:      { label: 'SAIL',      color: '#7C3AED' },
  trim:      { label: 'TRIM',      color: '#B45309' },
  catamaran: { label: 'Catamaran', color: '#D4AF37' },
  operator:  { label: 'Operator',  color: '#CC2200' },
  synergy:   { label: 'Synergy',   color: '#C9A96E' },
  scenario:  { label: 'Scenario',  color: '#00C9B1' },
}

const FOLLOW_UPS: Record<AnalysisMode, string[]> = {
  upwind:    ['What are the biggest execution risks?', 'How should we prioritize these steps?', 'Build a 90-day milestone roadmap.'],
  downwind:  ['How do I overcome the main obstacle?', 'What metrics should I track?', 'Give me a one-week action list.'],
  sail:      ['Drill deeper into the highest-impact insight.', 'What competitive threats should I monitor?', 'Turn this into a board-ready summary.'],
  trim:      ['Which milestone is most at risk?', 'Who should own each milestone?', 'Add contingency buffers to the critical path.'],
  catamaran: ['How do we balance both tracks?', 'What if we focus only on Track A first?', 'Build the resource allocation plan.'],
  operator:  ['Give me the next 3 tactical moves right now.', 'What is the highest-leverage action this week?', 'Identify the single biggest constraint.'],
  synergy:   ["Which mode's perspective is most critical?", 'Where do the modes disagree and why?', 'Synthesise all perspectives into one action.'],
  scenario:  ['What is the worst-case scenario probability?', 'How do I hedge against the downside?', 'Run the bull-case scenario instead.'],
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
        {/* Bubble */}
        <div style={{
          background:          'linear-gradient(145deg, #0C1929 0%, #112237 55%, #0A1628 100%)',
          borderRadius:        '16px 16px 4px 16px',
          padding:             '12px 16px',
          position:            'relative',
          overflow:            'hidden',
          boxShadow:           '0 4px 20px rgba(12,25,41,0.22), 0 1px 4px rgba(0,0,0,0.1)',
          border:              '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Teal-to-gold hairline */}
          <div style={{
            position:   'absolute',
            top:         0,
            left:       '10%',
            right:      '10%',
            height:      1,
            background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.4), rgba(201,169,110,0.25), transparent)',
          }} />
          <p style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       14,
            fontWeight:     400,
            lineHeight:     1.65,
            letterSpacing: '-0.01em',
            color:         '#EEF2F5',
            margin:         0,
            whiteSpace:    'pre-wrap',
            wordBreak:     'break-word',
          }}>
            {text}
          </p>
        </div>
        {/* Meta row */}
        <div style={{
          display:        'flex',
          justifyContent: 'flex-end',
          alignItems:     'center',
          gap:             6,
          marginTop:       4,
        }}>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9,
            fontWeight:     700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color,
            opacity:        0.7,
          }}>
            {modeLabel}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: 'rgba(12,25,41,0.3)', letterSpacing: '0.02em' }}>
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
  const meta  = MODE_META[message.mode] ?? MODE_META.upwind
  const chips = FOLLOW_UPS[message.mode] ?? []
  const ts    = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ paddingRight: 16 }}
    >
      {/* Mode header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 4 }}>
        {/* Status dot */}
        <motion.span
          animate={message.streaming
            ? { opacity: [1, 0.15, 1], scale: [1, 0.65, 1] }
            : { opacity: 0.55, scale: 1 }}
          transition={{ duration: 1.1, repeat: message.streaming ? Infinity : 0 }}
          style={{
            display:      'inline-block',
            width:         7,
            height:        7,
            borderRadius: '50%',
            background:   meta.color,
            flexShrink:   0,
            boxShadow:    message.streaming ? `0 0 8px ${meta.color}88` : 'none',
          }}
        />
        {/* Mode label */}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       10,
          fontWeight:     700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         meta.color,
        }}>
          {meta.label}
        </span>
        {/* Status text */}
        <span style={{
          fontFamily:  'Inter, sans-serif',
          fontSize:     10,
          color:       message.streaming ? 'rgba(20,184,166,0.65)' : 'rgba(232,237,243,0.35)',
          fontStyle:   message.streaming ? 'italic' : 'normal',
          letterSpacing:'0.02em',
        }}>
          {message.streaming ? '· Processing intelligence…' : `· ${ts}`}
        </span>
      </div>

      {/* Glass card */}
      <div style={{
        background:          'rgba(255,255,255,0.04)',
        backdropFilter:      'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:              '1px solid rgba(255,255,255,0.09)',
        borderTop:           `2px solid ${meta.color}`,
        borderRadius:        '4px 16px 16px 16px',
        overflow:            'hidden',
        boxShadow:           `0 4px 24px ${meta.color}18, 0 1px 4px rgba(0,0,0,0.3)`,
        position:            'relative',
      }}>
        {renderPayload(message)}

        {/* Streaming cursor at end of text content */}
        {message.streaming && message.payload.type === 'text' && message.payload.text && (
          <div style={{ paddingBottom: 16, paddingLeft: 20 }}>
            <StreamingCursor streaming />
          </div>
        )}
      </div>

      {/* Follow-up chips */}
      {!message.streaming && message.payload.type !== 'error' && chips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.25 }}
          style={{
            display:     'flex',
            flexWrap:    'wrap',
            gap:          6,
            marginTop:    12,
            paddingLeft:  4,
            alignItems:  'center',
          }}
        >
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9,
            fontWeight:     600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         'rgba(232,237,243,0.3)',
          }}>
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
                padding:         '5px 12px',
                background:      'rgba(255,255,255,0.05)',
                backdropFilter:  'blur(12px)',
                border:          `1px solid ${meta.color}40`,
                borderRadius:    9999,
                fontFamily:      'Inter, sans-serif',
                fontSize:        11,
                fontWeight:      500,
                color:           meta.color,
                cursor:          'pointer',
                lineHeight:      1.4,
                letterSpacing:   '0.01em',
                boxShadow:       '0 1px 4px rgba(0,0,0,0.2)',
                transition:      'all 0.15s',
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
          <span style={{ color: '#991B1B', flexShrink: 0 }}>⚠</span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.55 }}>
            {payload.message}
          </p>
        </div>
      )

    case 'executive':
      return (
        <ExecutiveResponseCard
          response={payload.data as never}
          isStreaming={streaming}
          variant="light"
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
      // downwind, operator, scenario, generic text
      return (
        <div style={{ padding: '20px 20px 16px' }}>
          {streaming && !payload.text && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.4, repeat: Infinity }}
                style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
              <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.18 }}
                style={{ width: 24, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.07)' }} />
              <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.36 }}
                style={{ width: 16, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.05)' }} />
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
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:            20,
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
    </div>
  )
}
