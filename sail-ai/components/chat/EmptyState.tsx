'use client'

/**
 * EmptyState — Master Guide
 * ─────────────────────────────────────────────────────────────────────────────
 * Codecademy-style first-run experience. Shown when the thread is empty.
 * Teaches the user the three primary modes via interactive cards + keyboard nav.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion }                           from 'framer-motion'
import type { AnalysisMode }                from '@/components/ModeSelector'
import { useLanguage }                      from '@/lib/i18n/LanguageContext'
import type { TranslationKey }              from '@/lib/i18n/translations'

// ── Mode showcase cards ────────────────────────────────────────────────────────

const MODES: {
  id:      AnalysisMode
  color:   string
  bg:      string
  label:   string
  icon:    string
  tagline: string
  sample:  string
}[] = [
  {
    id:      'upwind',
    color:   '#0F6CBD',
    bg:      'rgba(15,108,189,0.06)',
    label:   'UPWIND',
    icon:    '◎',
    tagline: 'Executive strategy. BLUF format.',
    sample:  'We\'re losing 22% of customers in month 3. How do we stop the churn?',
  },
  {
    id:      'sail',
    color:   '#7C3AED',
    bg:      'rgba(124,58,237,0.06)',
    label:   'SAIL',
    icon:    '◈',
    tagline: 'Adaptive intelligence. Streams live.',
    sample:  'Analyse our unit economics and identify the highest-leverage cost reduction.',
  },
  {
    id:      'trim',
    color:   '#B45309',
    bg:      'rgba(180,83,9,0.06)',
    label:   'TRIM',
    icon:    '▤',
    tagline: 'Milestone roadmap. 30/60/90 day.',
    sample:  'Build a go-to-market timeline for our B2B SaaS expansion into Europe.',
  },
]

const QUICK_PICKS: { labelKey: TranslationKey; questionKey: TranslationKey }[] = [
  { labelKey: 'chat.pick.firstCustomers', questionKey: 'chat.q.firstCustomers' },
  { labelKey: 'chat.pick.findLosses',     questionKey: 'chat.q.loseMoney'     },
  { labelKey: 'chat.pick.monthlyFocus',   questionKey: 'chat.q.monthlyFocus'  },
  { labelKey: 'chat.pick.raisePrices',    questionKey: 'chat.q.raisePrices'   },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onModeSelect: (mode: AnalysisMode) => void
  onQuickPick:  (text: string)       => void
}

export function EmptyState({ onModeSelect, onQuickPick }: EmptyStateProps) {
  const { t }                 = useLanguage()
  const [focused, setFocused] = useState<number>(-1)

  // Keyboard nav for mode cards
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setFocused(f => Math.min(f + 1, MODES.length - 1))
    if (e.key === 'ArrowLeft')  setFocused(f => Math.max(f - 1, 0))
    if (e.key === 'Enter' && focused >= 0) onModeSelect(MODES[focused].id)
  }, [focused, onModeSelect])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '32px 24px 24px',
        gap:            32,
        height:         '100%',
        minHeight:      320,
      }}
    >
      {/* ── Hero text ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        <p style={{
          fontFamily:    'Cormorant Garamond, Georgia, serif',
          fontSize:      22,
          fontWeight:    300,
          letterSpacing: '-0.04em',
          color:         '#0C1929',
          margin:        '0 0 8px',
          lineHeight:    1.2,
        }}>
          Set Your Course
        </p>
        <p style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      12,
          fontWeight:    500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         '#9CA3AF',
          margin:        0,
        }}>
          Select a mode · or type below
        </p>
      </motion.div>

      {/* ── Mode cards ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:                 12,
        width:               '100%',
        maxWidth:            600,
      }}>
        {MODES.map((m, i) => {
          const isActive = focused === i
          return (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, boxShadow: `0 8px 32px ${m.color}18, 0 2px 8px rgba(0,0,0,0.06)` }}
              whileTap={{ scale: 0.97 }}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(-1)}
              onClick={() => { onModeSelect(m.id); onQuickPick(m.sample) }}
              style={{
                background:    isActive ? m.bg : 'rgba(255,255,255,0.82)',
                backdropFilter:'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border:        `1px solid ${isActive ? `${m.color}40` : 'rgba(255,255,255,0.95)'}`,
                borderTop:     `2px solid ${isActive ? m.color : 'transparent'}`,
                borderRadius:  12,
                padding:       '16px 14px',
                cursor:        'pointer',
                textAlign:     'left',
                boxShadow:     isActive
                  ? `0 4px 24px ${m.color}12, 0 1px 4px rgba(0,0,0,0.04)`
                  : '0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
                transition:    'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                outline:       'none',
              }}
            >
              {/* Icon + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{
                  fontSize:   16,
                  color:      m.color,
                  lineHeight: 1,
                  flexShrink: 0,
                }}>
                  {m.icon}
                </span>
                <span style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      10,
                  fontWeight:    700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         m.color,
                }}>
                  {m.label}
                </span>
              </div>
              {/* Tagline */}
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   12,
                fontWeight: 500,
                color:      '#374151',
                margin:     '0 0 6px',
                lineHeight: 1.4,
              }}>
                {m.tagline}
              </p>
              {/* Sample prompt */}
              <p style={{
                fontFamily:  'Inter, sans-serif',
                fontSize:    11,
                color:       '#9CA3AF',
                margin:      0,
                lineHeight:  1.5,
                display:     '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow:    'hidden',
              }}>
                "{m.sample.slice(0, 60)}…"
              </p>
              {/* Arrow cue */}
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                style={{
                  marginTop:  8,
                  fontSize:   11,
                  color:      m.color,
                  opacity:    0.6,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Try this →
              </motion.div>
            </motion.button>
          )
        })}
      </div>

      {/* ── Quick pick chips ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}
      >
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      10,
          fontWeight:    600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         '#9CA3AF',
          width:         '100%',
          textAlign:     'center',
          marginBottom:  4,
        }}>
          Quick start
        </span>
        {QUICK_PICKS.map(({ labelKey, questionKey }, i) => (
          <motion.button
            key={labelKey}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.06, duration: 0.25 }}
            whileHover={{ borderColor: 'rgba(12,25,41,0.2)', color: '#0C1929' }}
            onClick={() => onQuickPick(t(questionKey))}
            style={{
              padding:       '6px 14px',
              border:        '1px solid rgba(0,0,0,0.08)',
              borderRadius:  9999,
              background:    'rgba(255,255,255,0.7)',
              fontFamily:    'Inter, sans-serif',
              fontSize:      12,
              color:         '#6B7280',
              cursor:        'pointer',
              whiteSpace:    'nowrap',
              transition:    'border-color 0.15s, color 0.15s',
              outline:       'none',
            }}
          >
            {t(labelKey)}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Keyboard hint ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      10,
          color:         '#C4C8CC',
          textAlign:     'center',
          margin:        0,
          letterSpacing: '0.04em',
        }}
      >
        ← → navigate · Enter select · ⌘↩ send
      </motion.p>
    </div>
  )
}
