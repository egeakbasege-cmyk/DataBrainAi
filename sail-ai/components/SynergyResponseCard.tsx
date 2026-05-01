'use client'

/**
 * SynergyResponseCard
 *
 * Renders the streaming war-room response from the CUSTOM SYNERGY mode.
 * Parses layer markers (▸ STRIKE, ▸ INTELLIGENCE, etc.) and applies
 * per-layer colour accents sourced from the active mode palette.
 *
 * Props:
 *   text        — accumulated streaming markdown text
 *   streaming   — true while the stream is live
 *   modes       — array of active sub-mode ids
 *   companyName — optional company name (from BrandConfig)
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SailAdapter } from '@/components/SailAdapter'

// ── Mode palette (must match ModeSelector) ────────────────────────────────────
const MODE_META: Record<string, { color: string; label: string }> = {
  upwind:    { color: '#1A5276', label: 'Upwind'    },
  downwind:  { color: '#00695C', label: 'Downwind'  },
  sail:      { color: '#7C3AED', label: 'SAIL'      },
  trim:      { color: '#B45309', label: 'TRIM'      },
  catamaran: { color: '#D4AF37', label: 'CATAMARAN' },
  operator:  { color: '#CC2200', label: 'OPERATOR'  },
}

// ── Layer header mapping (▸ KEYWORD → mode colour) ───────────────────────────
const LAYER_COLORS: Record<string, string> = {
  'STRIKE':      '#1A5276',
  'INTELLIGENCE':'#00695C',
  'RADAR':       '#7C3AED',
  'ROADMAP':     '#B45309',
  'DUAL TRACK':  '#D4AF37',
  'DEEP CALC':   '#CC2200',
  'SYNTHESIS':   '#C9A96E',
  'WAR ROOM SYNTHESIS': '#C9A96E',
}

/** Split markdown into segments separated by ▸ layer headers */
interface LayerSegment {
  key: string       // e.g. 'STRIKE'
  color: string
  heading: string   // full heading text e.g. '▸ STRIKE [UPWIND MODULE — Strategic Strike Commander]'
  body: string
}

function parseLayers(text: string): LayerSegment[] {
  const headerRe = /^(▸\s+[A-Z][A-Z\s]+)(?:\s*\[.*?\])?$/m
  const lines = text.split('\n')
  const segments: LayerSegment[] = []
  let current: LayerSegment | null = null

  for (const line of lines) {
    // Detect a ▸ heading (starts with ###▸ or bare ▸)
    const stripped = line.replace(/^#+\s*/, '').trim()
    if (stripped.startsWith('▸')) {
      // Save previous segment
      if (current) segments.push({ ...current, body: current.body.trim() })

      // Determine colour from key
      const key = Object.keys(LAYER_COLORS).find(k => stripped.toUpperCase().includes(k)) ?? 'SYNTHESIS'
      const color = LAYER_COLORS[key] ?? '#C9A96E'
      current = { key, color, heading: stripped, body: '' }
    } else if (current) {
      current.body += line + '\n'
    }
    // Lines before first heading are discarded (internal protocol output)
  }
  if (current) segments.push({ ...current, body: current.body.trim() })

  return segments
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LayerSection({ seg, isLast }: { seg: LayerSegment; isLast: boolean }) {
  const isSynthesis = seg.key === 'SYNTHESIS' || seg.key === 'WAR ROOM SYNTHESIS'

  return (
    <div style={{
      borderLeft:    `2px solid ${seg.color}`,
      paddingLeft:   '1rem',
      marginBottom:  isLast ? 0 : '1.25rem',
      position:      'relative',
    }}>
      {/* Layer label */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '0.4rem',
        marginBottom:  '0.625rem',
      }}>
        <span style={{
          width:         6,
          height:        6,
          borderRadius:  '50%',
          background:    seg.color,
          flexShrink:    0,
        }} />
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.58rem',
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         seg.color,
        }}>
          {seg.heading.replace(/▸\s*/, '').split('[')[0].trim()}
        </span>
        {isSynthesis && (
          <span style={{
            padding:       '1px 6px',
            background:    'rgba(201,169,110,0.15)',
            border:        '1px solid rgba(201,169,110,0.4)',
            borderRadius:  '3px',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.5rem',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         '#C9A96E',
            marginLeft:    '0.25rem',
          }}>
            UNIFIED
          </span>
        )}
      </div>

      {/* Layer content */}
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.88rem',
        lineHeight: 1.7,
        color:      '#1A1A2E',
      }}>
        <SailAdapter text={seg.body} intent="analytic" streaming={false} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  text:        string
  streaming:   boolean
  modes:       string[]
  companyName?: string
}

export function SynergyResponseCard({ text, streaming, modes, companyName }: Props) {
  const segments = useMemo(() => parseLayers(text), [text])
  const activeModes = modes.filter(m => MODE_META[m])
  const gradientColors = activeModes.map(m => MODE_META[m].color)

  // Build a subtle gradient border string from active mode colours
  const prismGradient = gradientColors.length >= 2
    ? `linear-gradient(90deg, ${gradientColors.join(', ')})`
    : 'linear-gradient(90deg, #C9A96E, #E8C87A)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background:   '#FFFFFF',
        border:       '1px solid rgba(201,169,110,0.2)',
        borderRadius: '14px',
        overflow:     'hidden',
        boxShadow:    '0 2px 20px rgba(201,169,110,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Prism accent line ── */}
      <div style={{ height: '2px', background: prismGradient }} />

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {/* Animated pulse while streaming */}
          <AnimatePresence>
            {streaming && (
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  display:      'inline-block',
                  width:         6,
                  height:        6,
                  borderRadius:  '50%',
                  background:    '#C9A96E',
                  flexShrink:    0,
                }}
              />
            )}
          </AnimatePresence>

          {/* Company name + mode label */}
          <div>
            {companyName && (
              <div style={{
                fontFamily:             '"Cormorant Garamond", "Cormorant", Georgia, serif',
                fontSize:               '0.78rem',
                fontStyle:              'italic',
                fontWeight:             600,
                letterSpacing:          '0.04em',
                background:             'linear-gradient(90deg, #C9A96E, #E8C87A, #C9A96E)',
                WebkitBackgroundClip:   'text',
                WebkitTextFillColor:    'transparent',
                backgroundClip:         'text',
                marginBottom:           '1px',
              }}>
                {companyName}
              </div>
            )}
            <div style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6rem',
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'rgba(201,169,110,0.7)',
            }}>
              {streaming ? 'War Room Assembling…' : 'Custom Synergy · Hybrid Intelligence'}
            </div>
          </div>
        </div>

        {/* Mode chips */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {activeModes.map(m => (
            <span key={m} style={{
              padding:       '2px 8px',
              borderRadius:  '999px',
              background:    `${MODE_META[m].color}22`,
              border:        `1px solid ${MODE_META[m].color}55`,
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.5rem',
              fontWeight:    700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color:         MODE_META[m].color,
            }}>
              {MODE_META[m].label}
            </span>
          ))}
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
            ⊕ HYBRID ENGINE
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '1.5rem 1.25rem' }}>
        {/* Loading skeleton while no segments yet */}
        {streaming && segments.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[60, 45, 70, 55].map((w, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                style={{ height: 10, borderRadius: 5, background: 'rgba(201,169,110,0.15)', width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {/* Layer sections */}
        {segments.length > 0 && (
          <div>
            {segments.map((seg, i) => (
              <LayerSection key={seg.key + i} seg={seg} isLast={i === segments.length - 1} />
            ))}
          </div>
        )}

        {/* Streaming tail — raw text before first header is parsed */}
        {streaming && segments.length === 0 && text.length > 0 && (
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '0.85rem',
            color:      '#71717A',
            lineHeight: 1.6,
            margin:     0,
            whiteSpace: 'pre-wrap',
          }}>
            {text}
          </p>
        )}
      </div>

      {/* ── Footer: war room stamp ── */}
      {!streaming && segments.length > 0 && (
        <div style={{
          padding:     '0.625rem 1.25rem',
          borderTop:   '1px solid rgba(201,169,110,0.08)',
          background:  'rgba(201,169,110,0.02)',
          display:     'flex',
          alignItems:  'center',
          gap:         '0.5rem',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" fill="#C9A96E" opacity="0.7"/>
          </svg>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.58rem',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color:         'rgba(201,169,110,0.5)',
          }}>
            {activeModes.length}-module synthesis complete · {companyName ?? 'Aetheris'} War Room
          </span>
        </div>
      )}
    </motion.div>
  )
}
