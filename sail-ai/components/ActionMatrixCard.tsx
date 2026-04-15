'use client'

/**
 * ActionMatrixCard
 *
 * High-density data visualisation card for a single ActionMatrixOption.
 * Renders inside the dark Aetheris terminal (AetherisShell) but also
 * works in the light-mode context with `variant="light"`.
 *
 * Anatomy (top → bottom):
 *   ─ Density score micro-bar     (full-width, 2px, gold→chrome gradient)
 *   ─ Header row: title + success-rate badge
 *   ─ Description                 (body text, 13px)
 *   ─ Metric strip                (timeframe chip · density score · success bar)
 *
 * Design principles:
 *   - Zero border-radius on the card itself (Swiss style)
 *   - Exactly one coloured element per section: gold for selection,
 *     chrome for neutral state
 *   - Numbers in Cormorant Garamond; labels in Inter caps
 */

import { useRef }           from 'react'
import { motion }           from 'framer-motion'
import type { ActionMatrixOption } from '@/types/architecture'
import { useLanguage }      from '@/lib/i18n/LanguageContext'

interface ActionMatrixCardProps {
  option:       ActionMatrixOption
  index:        number          // stagger delay
  isSelected?:  boolean
  onSelect?:    (id: string) => void
  variant?:     'dark' | 'light'
}

export function ActionMatrixCard({
  option,
  index,
  isSelected  = false,
  onSelect,
  variant     = 'dark',
}: ActionMatrixCardProps) {
  const isDark = variant === 'dark'
  const ref    = useRef<HTMLDivElement>(null)
  const { t }  = useLanguage()

  const successPct = Math.round(option.sectorMedianSuccessRate * 100)

  // ── Colour tokens per variant ─────────────────────────────────────────────
  const tk = isDark
    ? {
        card:        isSelected
          ? 'background:#1A1A2A; border:1px solid rgba(201,169,110,0.25); box-shadow:inset 0 1px 0 rgba(201,169,110,0.10)'
          : 'background:#141420; border:1px solid rgba(226,226,232,0.08); box-shadow:inset 0 1px 0 rgba(226,226,232,0.06)',
        title:       isSelected ? '#D4B980' : '#E2E2E8',
        body:        '#9898B0',
        label:       '#606078',
        value:       isSelected ? '#D4B980' : '#B0B0BC',
        barTrack:    'rgba(226,226,232,0.08)',
        barFill:     isSelected ? '#C9A96E' : '#B0B0BC',
        barFillHi:   '#4ADE80',
        timeframeBg: 'rgba(226,226,232,0.05)',
        timeframeBorder: 'rgba(226,226,232,0.10)',
        timeframeText:   '#9898B0',
      }
    : {
        card:        isSelected
          ? 'background:#FDF9F2; border:1px solid rgba(201,169,110,0.35)'
          : 'background:#FFFFFF; border:1px solid rgba(0,0,0,0.09)',
        title:       isSelected ? '#A8873E' : '#0C0C0E',
        body:        '#71717A',
        label:       '#A1A1AA',
        value:       isSelected ? '#A8873E' : '#3A3A3C',
        barTrack:    'rgba(0,0,0,0.07)',
        barFill:     isSelected ? '#C9A96E' : '#3A3A3C',
        barFillHi:   '#15803D',
        timeframeBg: '#F5F5F5',
        timeframeBorder: 'rgba(0,0,0,0.08)',
        timeframeText:   '#71717A',
      }

  const densityWidth = `${option.densityScore}%`
  const successWidth = `${successPct}%`

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay:    index * 0.07,
        ease:     [0.16, 1, 0.3, 1],
      }}
      onClick={() => onSelect?.(option.id)}
      style={{
        cursor:     onSelect ? 'pointer' : 'default',
        position:   'relative',
        overflow:   'hidden',
        ...parseCSSString(tk.card),
        transition: 'border-color 0.18s, background 0.18s',
      }}
    >
      {/* Density micro-bar — full-width 2px strip at top */}
      <div style={{ height: 2, width: '100%', background: tk.barTrack, position: 'relative', overflow: 'hidden' }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: index * 0.07 + 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position:        'absolute',
            inset:           0,
            transformOrigin: 'left',
            background:      `linear-gradient(90deg, ${tk.barFill} 0%, ${isDark ? 'rgba(226,226,232,0.4)' : 'rgba(0,0,0,0.15)'} ${densityWidth}, transparent ${densityWidth})`,
          }}
        />
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px' }}>

        {/* Header: title + success rate badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <p style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.8125rem',
            fontWeight:    600,
            color:         tk.title,
            lineHeight:    1.35,
            letterSpacing: '-0.01em',
            flex:          1,
          }}>
            {option.title}
          </p>

          {/* Success rate pill */}
          <div style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           4,
            padding:       '2px 7px',
            background:    successPct >= 70 ? (isDark ? 'rgba(74,222,128,0.08)' : 'rgba(21,128,61,0.07)') : tk.timeframeBg,
            border:        `1px solid ${successPct >= 70 ? (isDark ? 'rgba(74,222,128,0.2)' : 'rgba(21,128,61,0.2)') : tk.timeframeBorder}`,
            flexShrink:    0,
          }}>
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.625rem',
              fontWeight:    700,
              letterSpacing: '0.08em',
              color:         successPct >= 70 ? tk.barFillHi : tk.timeframeText,
            }}>
              {successPct}%
            </span>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontFamily:  'Inter, sans-serif',
          fontSize:    '0.75rem',
          color:       tk.body,
          lineHeight:  1.55,
          marginBottom: 14,
        }}>
          {option.description}
        </p>

        {/* Metric strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Timeframe chip */}
          <div style={{
            display:    'inline-flex',
            alignItems: 'center',
            padding:    '2px 7px',
            background: tk.timeframeBg,
            border:     `1px solid ${tk.timeframeBorder}`,
          }}>
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6rem',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         tk.timeframeText,
            }}>
              {option.implementationTimeDays}d
            </span>
          </div>

          {/* Density label + bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.575rem',
              fontWeight:    600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         tk.label,
              whiteSpace:    'nowrap',
            }}>
              {t('aetheris.matrix.densityScore')}
            </span>
            <div style={{ flex: 1, height: 2, background: tk.barTrack, position: 'relative', overflow: 'hidden' }}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: index * 0.07 + 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position:        'absolute',
                  inset:           0,
                  transformOrigin: 'left',
                  width:           densityWidth,
                  background:      tk.barFill,
                }}
              />
            </div>
            <span style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize:   '0.875rem',
              fontWeight: 600,
              color:      tk.value,
              lineHeight: 1,
            }}>
              {option.densityScore}
            </span>
          </div>

          {/* Success bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.575rem',
              fontWeight:    600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         tk.label,
              whiteSpace:    'nowrap',
            }}>
              {t('aetheris.matrix.successRate')}
            </span>
            <div style={{ flex: 1, height: 2, background: tk.barTrack, position: 'relative', overflow: 'hidden' }}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.55, delay: index * 0.07 + 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position:        'absolute',
                  inset:           0,
                  transformOrigin: 'left',
                  width:           successWidth,
                  background:      successPct >= 70 ? tk.barFillHi : tk.barFill,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Tiny CSS-string → style object parser (for the card token strings) ────────
function parseCSSString(css: string): React.CSSProperties {
  const result: Record<string, string> = {}
  css.split(';').forEach(rule => {
    const [prop, ...rest] = rule.split(':')
    if (!prop || !rest.length) return
    const key   = prop.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    result[key] = rest.join(':').trim()
  })
  return result as React.CSSProperties
}
