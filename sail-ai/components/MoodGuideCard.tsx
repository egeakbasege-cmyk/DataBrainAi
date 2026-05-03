'use client'

/**
 * MoodGuideCard
 *
 * Displays the Gateway Router's routing recommendation after the user
 * submits a query in "Auto" mode. The card shows:
 *   - Detected mood badge
 *   - Selected mode with its colour accent
 *   - Alternative mode chip
 *   - Router reasoning (≤120 chars)
 *   - "Proceed with [Mode]" + "Switch to [Alt]" action buttons
 *   - Auto-proceeding indicator when urgencyLevel ≥ 0.8
 *
 * Props:
 *   data          — MoodGuideData from the __moodGuide API response
 *   phase         — current routing phase ('routing' | 'guiding' | 'idle' | 'error')
 *   onProceed     — called with the selected mode when user confirms
 *   onSwitch      — called with the alternative mode when user switches
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Mode palette ──────────────────────────────────────────────────────────────
const MODE_META: Record<string, { color: string; label: string; description: string }> = {
  upwind:    { color: '#1A5276', label: 'Upwind',    description: 'Metric-driven analysis'     },
  downwind:  { color: '#00695C', label: 'Downwind',  description: 'Coaching deep-dive'         },
  sail:      { color: '#7C3AED', label: 'SAIL',      description: 'Adaptive intelligence'      },
  trim:      { color: '#B45309', label: 'TRIM',      description: 'Phased timeline planning'   },
  catamaran: { color: '#D4AF37', label: 'Catamaran', description: 'Dual-track growth + CX'    },
  operator:  { color: '#CC2200', label: 'Operator',  description: 'Deep comprehensive intel'   },
  synergy:   { color: '#C9A96E', label: 'Synergy',   description: 'War-room council'           },
}

// ── Mood badge config ─────────────────────────────────────────────────────────
const MOOD_META: Record<string, { icon: string; color: string }> = {
  analytical:  { icon: '◈', color: '#1A5276' },
  exploratory: { icon: '◎', color: '#7C3AED' },
  urgent:      { icon: '◆', color: '#CC2200' },
  planning:    { icon: '◉', color: '#B45309' },
  creative:    { icon: '✦', color: '#00695C' },
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MoodGuideData {
  detectedMood:    string
  selectedMode:    string
  alternativeMode: string
  reasoning:       string
  urgencyLevel:    number
  confidence:      number
  autoProceeding:  boolean
}

interface Props {
  data:      MoodGuideData
  phase:     'routing' | 'guiding' | 'idle' | 'error'
  onProceed: (mode: string) => void
  onSwitch:  (mode: string) => void
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function RoutingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem 1.25rem' }}>
      {/* Animated label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#C9A96E' }}
        />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.7)' }}>
          Routing Query…
        </span>
      </div>
      {/* Skeleton bars */}
      {[55, 40, 70].map((w, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
          style={{ height: 10, borderRadius: 5, background: 'rgba(201,169,110,0.18)', width: `${w}%` }}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function MoodGuideCard({ data, phase, onProceed, onSwitch }: Props) {
  const selectedMeta = MODE_META[data.selectedMode]  ?? MODE_META['upwind']
  const altMeta      = MODE_META[data.alternativeMode] ?? MODE_META['sail']
  const moodMeta     = MOOD_META[data.detectedMood]  ?? MOOD_META['analytical']

  // Auto-proceed: fire onProceed immediately for high-urgency queries
  useEffect(() => {
    if (phase === 'guiding' && data.autoProceeding) {
      const timer = setTimeout(() => onProceed(data.selectedMode), 800)
      return () => clearTimeout(timer)
    }
  }, [phase, data.autoProceeding, data.selectedMode, onProceed])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      style={{
        background:   '#FFFFFF',
        border:       `1px solid ${selectedMeta.color}33`,
        borderRadius: '14px',
        overflow:     'hidden',
        boxShadow:    `0 2px 20px ${selectedMeta.color}0D, 0 1px 4px rgba(0,0,0,0.04)`,
      }}
    >
      {/* ── Top accent line ── */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${selectedMeta.color}, ${altMeta.color})` }} />

      {/* ── Header ── */}
      <div style={{
        padding:        '0.875rem 1.25rem',
        borderBottom:   '1px solid rgba(201,169,110,0.1)',
        background:     'linear-gradient(135deg, #0C0C0E 0%, #12082A 100%)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '0.75rem',
        flexWrap:       'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AnimatePresence>
            {phase === 'routing' && (
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#C9A96E', flexShrink: 0 }}
              />
            )}
          </AnimatePresence>
          <div>
            <div style={{
              fontFamily:    '"Cormorant Garamond", Georgia, serif',
              fontSize:      '0.78rem',
              fontStyle:     'italic',
              fontWeight:    600,
              letterSpacing: '0.04em',
              background:    'linear-gradient(90deg, #C9A96E, #E8C87A, #C9A96E)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip:       'text',
              marginBottom:  '1px',
            }}>
              Aetheris
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.7)' }}>
              {phase === 'routing' ? 'Routing Query…' : data.autoProceeding ? 'Auto-Proceeding…' : 'Route Detected · Select Mode'}
            </div>
          </div>
        </div>

        {/* Confidence chip */}
        {phase === 'guiding' && (
          <span style={{
            padding:       '2px 8px',
            borderRadius:  '999px',
            background:    'rgba(201,169,110,0.1)',
            border:        '1px solid rgba(201,169,110,0.3)',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.5rem',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         '#C9A96E',
          }}>
            {Math.round(data.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <AnimatePresence mode="wait">
        {phase === 'routing' ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RoutingSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="guide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '1.25rem' }}
          >
            {/* Mood badge + reasoning */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              <span style={{
                padding:       '3px 10px',
                borderRadius:  '999px',
                background:    `${moodMeta.color}18`,
                border:        `1px solid ${moodMeta.color}44`,
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.55rem',
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         moodMeta.color,
                display:       'flex',
                alignItems:    'center',
                gap:           '0.3rem',
              }}>
                <span>{moodMeta.icon}</span>
                {data.detectedMood}
              </span>
              {data.urgencyLevel >= 0.8 && (
                <span style={{
                  padding:       '3px 10px',
                  borderRadius:  '999px',
                  background:    '#CC220018',
                  border:        '1px solid #CC220044',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.55rem',
                  fontWeight:    700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color:         '#CC2200',
                }}>
                  ◆ HIGH URGENCY
                </span>
              )}
            </div>

            {data.reasoning && (
              <p style={{
                fontFamily:   'Inter, sans-serif',
                fontSize:     '0.82rem',
                lineHeight:   1.6,
                color:        '#3D3D4E',
                margin:       '0 0 1rem 0',
                fontStyle:    'italic',
              }}>
                "{data.reasoning}"
              </p>
            )}

            {/* Mode cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
              {/* Selected mode */}
              <div style={{
                padding:      '0.75rem',
                borderRadius: '10px',
                background:   `${selectedMeta.color}0D`,
                border:       `1.5px solid ${selectedMeta.color}55`,
                position:     'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: selectedMeta.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: selectedMeta.color }}>
                    {selectedMeta.label}
                  </span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#1A1A2E', margin: 0, lineHeight: 1.4 }}>
                  {selectedMeta.description}
                </p>
                <span style={{
                  position:      'absolute',
                  top:           6,
                  right:         8,
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.48rem',
                  fontWeight:    700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color:         selectedMeta.color,
                  opacity:       0.7,
                }}>
                  SELECTED
                </span>
              </div>

              {/* Alternative mode */}
              <div style={{
                padding:      '0.75rem',
                borderRadius: '10px',
                background:   `${altMeta.color}08`,
                border:       `1px solid ${altMeta.color}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: altMeta.color, flexShrink: 0, display: 'inline-block', opacity: 0.7 }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: altMeta.color, opacity: 0.8 }}>
                    {altMeta.label}
                  </span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#555566', margin: 0, lineHeight: 1.4 }}>
                  {altMeta.description}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            {!data.autoProceeding ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onProceed(data.selectedMode)}
                  style={{
                    flex:          1,
                    minWidth:      120,
                    padding:       '0.6rem 1rem',
                    borderRadius:  '8px',
                    background:    selectedMeta.color,
                    border:        'none',
                    cursor:        'pointer',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.72rem',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    color:         '#FFFFFF',
                    transition:    'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Proceed with {selectedMeta.label}
                </button>
                <button
                  onClick={() => onSwitch(data.alternativeMode)}
                  style={{
                    flex:          1,
                    minWidth:      120,
                    padding:       '0.6rem 1rem',
                    borderRadius:  '8px',
                    background:    'transparent',
                    border:        `1px solid ${altMeta.color}55`,
                    cursor:        'pointer',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.72rem',
                    fontWeight:    600,
                    letterSpacing: '0.06em',
                    color:         altMeta.color,
                    transition:    'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${altMeta.color}12`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Switch to {altMeta.label}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#CC2200' }}
                />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, color: '#CC2200', letterSpacing: '0.04em' }}>
                  High urgency detected — proceeding automatically with {selectedMeta.label}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
