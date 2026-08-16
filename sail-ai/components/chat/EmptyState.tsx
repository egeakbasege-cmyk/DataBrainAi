'use client'

/**
 * EmptyState — Light Glass Premium Welcome
 * ─────────────────────────────────────────────────────────────────────────────
 * Palette: tiffany glass · white · gold accents · dark text
 */

import { useState, useEffect, useCallback } from 'react'
import { motion }                           from 'framer-motion'
import type { AnalysisMode }                from '@/components/ModeSelector'
import { useLanguage }                      from '@/lib/i18n/LanguageContext'
import type { TranslationKey }              from '@/lib/i18n/translations'

// ── Palette ───────────────────────────────────────────────────────────────────

const T = {
  textPrimary: '#E8EDF3',
  textSub:     'rgba(232,237,243,0.80)',
  textMuted:   'rgba(232,237,243,0.52)',
  textFaint:   'rgba(232,237,243,0.30)',
  glass:       'rgba(255,255,255,0.05)',
  glassMd:     'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(201,169,110,0.20)',
  gold:        '#C9A96E',
  goldDim:     'rgba(201,169,110,0.10)',
  goldBorder:  'rgba(201,169,110,0.35)',
  teal:        '#81d8d0',
} as const

// ── Mode showcase ─────────────────────────────────────────────────────────────

const MODES = [
  {
    id:      'upwind' as AnalysisMode,
    color:   '#2563EB',
    glow:    'rgba(37,99,235,0.12)',
    icon:    '◎',
    label:   'UPWIND',
    tagline: 'Executive strategy, delivered BLUF.',
    sample:  'We\'re losing 22% of customers in month 3. How do we stop the churn?',
  },
  {
    id:      'sail' as AnalysisMode,
    color:   '#7C3AED',
    glow:    'rgba(124,58,237,0.12)',
    icon:    '◈',
    label:   'SAIL',
    tagline: 'Adaptive intelligence. Live streaming.',
    sample:  'Analyse our unit economics and identify the highest-leverage cost reduction.',
  },
  {
    id:      'trim' as AnalysisMode,
    color:   '#B45309',
    glow:    'rgba(180,83,9,0.12)',
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
      padding:        '52px 28px 36px',
      gap:             36,
      minHeight:       360,
    }}>

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        {/* Gold decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width:        64,
            height:       1,
            background:  `linear-gradient(90deg, transparent, ${T.gold}, transparent)`,
            margin:      '0 auto 20px',
            transformOrigin: 'center',
          }}
        />
        <p style={{
          fontFamily:    'var(--font-cormorant), Georgia, serif',
          fontSize:       30,
          fontWeight:     300,
          letterSpacing: '-0.04em',
          color:          T.textPrimary,
          margin:        '0 0 10px',
          lineHeight:     1.15,
        }}>
          Set Your{' '}
          <span style={{
            color:      T.gold,
            fontStyle:  'italic',
            fontWeight:  500,
          }}>
            Course
          </span>
        </p>
        <p style={{
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:       10,
          fontWeight:     500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:          T.textMuted,
          margin:         0,
        }}>
          Choose an intelligence mode · or type below
        </p>
      </motion.div>

      {/* ── Mode cards ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:                  14,
        width:               '100%',
        maxWidth:             600,
      }}>
        {MODES.map((m, i) => {
          const isFocused = focused === i
          return (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5, boxShadow: `0 20px 48px ${m.glow}` }}
              whileTap={{ scale: 0.97 }}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(-1)}
              onClick={() => { onModeSelect(m.id); onQuickPick(m.sample) }}
              style={{
                background:    isFocused
                  ? `linear-gradient(160deg, ${m.color}18 0%, rgba(10,17,40,0.82) 100%)`
                  : T.glass,
                backdropFilter:'blur(20px)',
                WebkitBackdropFilter:'blur(20px)',
                border:        `1px solid ${isFocused ? `${m.color}45` : T.glassBorder}`,
                borderTop:     `2px solid ${isFocused ? m.color : `${m.color}55`}`,
                borderRadius:   14,
                padding:       '20px 18px',
                cursor:        'pointer',
                textAlign:     'left',
                boxShadow:      isFocused
                  ? `0 8px 40px ${m.glow}, 0 0 0 1px rgba(201,169,110,0.08)`
                  : '0 2px 16px rgba(0,0,0,0.25)',
                transition:    'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                outline:       'none',
                position:      'relative',
                overflow:      'hidden',
              }}
            >
              {/* Subtle corner glow */}
              {isFocused && (
                <div style={{
                  position:    'absolute',
                  top:         -20,
                  right:       -20,
                  width:        60,
                  height:       60,
                  borderRadius: '50%',
                  background:   m.glow,
                  filter:      'blur(20px)',
                  pointerEvents:'none',
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontSize:   16,
                  color:      m.color,
                  lineHeight:  1,
                }}>
                  {m.icon}
                </span>
                <span style={{
                  fontFamily:    'var(--font-inter), sans-serif',
                  fontSize:       9,
                  fontWeight:     700,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color:          m.color,
                }}>
                  {m.label}
                </span>
              </div>

              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:    12,
                fontWeight:  500,
                color:       isFocused ? T.textSub : T.textMuted,
                margin:     '0 0 10px',
                lineHeight:  1.5,
                transition: 'color 0.2s',
              }}>
                {m.tagline}
              </p>

              <p style={{
                fontFamily:      'var(--font-inter), sans-serif',
                fontSize:         10,
                color:            T.textFaint,
                margin:           0,
                lineHeight:       1.55,
                display:         '-webkit-box',
                WebkitLineClamp:  2,
                WebkitBoxOrient: 'vertical',
                overflow:        'hidden',
                fontStyle:       'italic',
              }}>
                "{m.sample.slice(0, 58)}…"
              </p>

              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                style={{
                  marginTop:    12,
                  fontSize:      10,
                  color:         m.color,
                  opacity:       isFocused ? 1 : 0.55,
                  fontFamily:   'var(--font-inter), sans-serif',
                  fontWeight:    700,
                  letterSpacing: '0.08em',
                  transition:   'opacity 0.2s',
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
        transition={{ delay: 0.35, duration: 0.45 }}
        style={{
          display:        'flex',
          flexWrap:       'wrap',
          gap:             8,
          justifyContent: 'center',
          maxWidth:        560,
        }}
      >
        <span style={{
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:       9,
          fontWeight:     600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          T.textFaint,
          width:         '100%',
          textAlign:     'center',
          marginBottom:   4,
        }}>
          Quick start
        </span>
        {QUICK_PICKS.map(({ labelKey, questionKey }, i) => (
          <motion.button
            key={labelKey}
            initial={{ opacity: 0, scale: 0.90 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.40 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
              borderColor: T.goldBorder,
              background:  'rgba(201,169,110,0.08)',
              color:       T.gold,
            }}
            onClick={() => onQuickPick(t(questionKey))}
            style={{
              padding:       '7px 16px',
              border:        `1px solid ${T.glassBorder}`,
              borderRadius:   9999,
              background:     T.glass,
              backdropFilter:'blur(12px)',
              fontFamily:    'var(--font-inter), sans-serif',
              fontSize:       11,
              color:          T.textMuted,
              cursor:        'pointer',
              whiteSpace:    'nowrap',
              transition:    'all 0.2s cubic-bezier(0.22,1,0.36,1)',
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
        transition={{ delay: 0.6 }}
        style={{
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:       9,
          color:          T.textFaint,
          textAlign:     'center',
          margin:         0,
          letterSpacing: '0.08em',
        }}
      >
        ← → navigate · Enter select · {typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'}↩ send
      </motion.p>
    </div>
  )
}
