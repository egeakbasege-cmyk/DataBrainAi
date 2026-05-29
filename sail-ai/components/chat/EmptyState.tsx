'use client'

/**
 * EmptyState — Dark Executive Master Guide
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown when the thread is empty. Guides the user to their first analysis
 * via three interactive mode cards + quick-pick chips.
 * Dark, exclusive, executive aesthetic.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion }                           from 'framer-motion'
import type { AnalysisMode }                from '@/components/ModeSelector'
import { useLanguage }                      from '@/lib/i18n/LanguageContext'
import type { TranslationKey }              from '@/lib/i18n/translations'

// ── Palette ───────────────────────────────────────────────────────────────────

const T = {
  textPrimary: '#E8EDF3',
  textMuted:   'rgba(232,237,243,0.4)',
  glass:       'rgba(255,255,255,0.04)',
  border:      'rgba(255,255,255,0.08)',
  gold:        '#C9A96E',
} as const

// ── Mode showcase ─────────────────────────────────────────────────────────────

const MODES = [
  {
    id:      'upwind' as AnalysisMode,
    color:   '#3B82F6',
    icon:    '◎',
    label:   'UPWIND',
    tagline: 'Executive strategy, delivered BLUF.',
    sample:  'We\'re losing 22% of customers in month 3. How do we stop the churn?',
  },
  {
    id:      'sail' as AnalysisMode,
    color:   '#8B5CF6',
    icon:    '◈',
    label:   'SAIL',
    tagline: 'Adaptive intelligence. Live streaming.',
    sample:  'Analyse our unit economics and identify the highest-leverage cost reduction.',
  },
  {
    id:      'trim' as AnalysisMode,
    color:   '#F59E0B',
    icon:    '▤',
    label:   'TRIM',
    tagline: 'Milestone roadmap. 30 · 60 · 90 day.',
    sample:  'Build a go-to-market timeline for our B2B SaaS expansion into Europe.',
  },
]

const QUICK_PICKS: { labelKey: TranslationKey; questionKey: TranslationKey }[] = [
  { labelKey: 'chat.pick.firstCustomers', questionKey: 'chat.q.firstCustomers' },
  { labelKey: 'chat.pick.findLosses',     questionKey: 'chat.q.loseMoney'      },
  { labelKey: 'chat.pick.monthlyFocus',   questionKey: 'chat.q.monthlyFocus'   },
  { labelKey: 'chat.pick.raisePrices',    questionKey: 'chat.q.raisePrices'    },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onModeSelect: (mode: AnalysisMode) => void
  onQuickPick:  (text: string)       => void
}

export function EmptyState({ onModeSelect, onQuickPick }: EmptyStateProps) {
  const { t }                 = useLanguage()
  const [focused, setFocused] = useState<number>(-1)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setFocused(f => Math.min(f + 1, MODES.length - 1))
    if (e.key === 'ArrowLeft')  setFocused(f => Math.max(f - 1, 0))
    if (e.key === 'Enter' && focused >= 0) {
      onModeSelect(MODES[focused].id)
      onQuickPick(MODES[focused].sample)
    }
  }, [focused, onModeSelect, onQuickPick])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '48px 24px 32px',
      gap:             32,
      minHeight:       340,
    }}>

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        <p style={{
          fontFamily:    'Cormorant Garamond, Georgia, serif',
          fontSize:       24,
          fontWeight:     300,
          letterSpacing: '-0.04em',
          color:         T.textPrimary,
          margin:        '0 0 8px',
          lineHeight:     1.2,
        }}>
          Set Your Course
        </p>
        <p style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       10,
          fontWeight:     600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         T.textMuted,
          margin:         0,
        }}>
          Choose an intelligence mode · or type below
        </p>
      </motion.div>

      {/* ── Mode cards ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:                  12,
        width:               '100%',
        maxWidth:             580,
      }}>
        {MODES.map((m, i) => {
          const isFocused = focused === i
          return (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, boxShadow: `0 12px 40px ${m.color}18` }}
              whileTap={{ scale: 0.97 }}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(-1)}
              onClick={() => { onModeSelect(m.id); onQuickPick(m.sample) }}
              style={{
                background:    isFocused
                  ? `${m.color}10`
                  : 'rgba(255,255,255,0.03)',
                backdropFilter:'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border:        `1px solid ${isFocused ? `${m.color}40` : T.border}`,
                borderTop:     `2px solid ${isFocused ? m.color : 'transparent'}`,
                borderRadius:   12,
                padding:       '18px 16px',
                cursor:        'pointer',
                textAlign:     'left',
                boxShadow:      isFocused
                  ? `0 4px 32px ${m.color}14`
                  : '0 2px 12px rgba(0,0,0,0.3)',
                transition:    'all 0.2s ease',
                outline:       'none',
              }}
            >
              {/* Icon + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 16, color: m.color, lineHeight: 1 }}>{m.icon}</span>
                <span style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:       9,
                  fontWeight:     700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color:         m.color,
                }}>
                  {m.label}
                </span>
              </div>

              {/* Tagline */}
              <p style={{
                fontFamily:  'Inter, sans-serif',
                fontSize:     12,
                fontWeight:   500,
                color:        isFocused ? T.textPrimary : 'rgba(232,237,243,0.65)',
                margin:      '0 0 8px',
                lineHeight:   1.45,
                transition:  'color 0.2s',
              }}>
                {m.tagline}
              </p>

              {/* Sample */}
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:    10,
                color:      'rgba(232,237,243,0.28)',
                margin:      0,
                lineHeight:  1.5,
                display:    '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow:    'hidden',
              }}>
                "{m.sample.slice(0, 58)}…"
              </p>

              {/* CTA arrow */}
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                style={{
                  marginTop:   10,
                  fontSize:     10,
                  color:       m.color,
                  opacity:     0.55,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight:  600,
                  letterSpacing: '0.06em',
                }}
              >
                Try this →
              </motion.div>
            </motion.button>
          )
        })}
      </div>

      {/* ── Quick picks ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 540 }}
      >
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       9,
          fontWeight:     600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         T.textMuted,
          width:         '100%',
          textAlign:     'center',
          marginBottom:   4,
        }}>
          Quick start
        </span>
        {QUICK_PICKS.map(({ labelKey, questionKey }, i) => (
          <motion.button
            key={labelKey}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.38 + i * 0.06 }}
            whileHover={{ borderColor: 'rgba(255,255,255,0.18)', color: T.textPrimary }}
            onClick={() => onQuickPick(t(questionKey))}
            style={{
              padding:      '6px 14px',
              border:       '1px solid rgba(255,255,255,0.1)',
              borderRadius:  9999,
              background:   'rgba(255,255,255,0.04)',
              fontFamily:   'Inter, sans-serif',
              fontSize:      11,
              color:        'rgba(232,237,243,0.5)',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
              transition:   'all 0.15s',
              outline:      'none',
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
        transition={{ delay: 0.55 }}
        style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       9,
          color:         'rgba(232,237,243,0.22)',
          textAlign:     'center',
          margin:         0,
          letterSpacing: '0.06em',
        }}
      >
        ← → navigate · Enter select · ⌘↩ send
      </motion.p>
    </div>
  )
}
