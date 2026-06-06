'use client'

/**
 * components/SovereignDashboard.tsx — Rotating Pill-Card Mode Picker
 * ─────────────────────────────────────────────────────────────────────────────
 * Light teal-mint background, one elegant white pill card centred on screen.
 * Ghost cards peek from behind on left and right — clicking anywhere on the
 * background (outside the active card) rotates to the next mode.
 * Left-edge click goes backward, right-edge / center goes forward.
 *
 * Card shape: exactly the pill from the original fan-layout screenshot.
 * Blue-mint (#14B8A6 / #2DD4BF) used for fine accents only.
 * All other props/behaviour unchanged — chat/page.tsx needs no edits.
 */

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence }        from 'framer-motion'
import { useLanguage }                    from '@/lib/i18n/LanguageContext'
import type { TranslationKey }            from '@/lib/i18n/translations'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SovereignMode = 'upwind' | 'synergy' | 'sail' | 'trim' | 'catamaran'

export interface SovereignDashboardProps {
  initialMode?:     SovereignMode
  onModeSelect:     (mode: SovereignMode) => void
  confidenceScore?: number
  processingMs?:    number
  companyName?:     string
  className?:       string
}

// ── Mode data ─────────────────────────────────────────────────────────────────

interface ModeDef {
  id:        SovereignMode
  labelKey:  TranslationKey
  descKey:   TranslationKey
  /** Teal-mint tint for the card's inner accent line */
  accent:    string
  stat:      string
  statLabel: string
  badge?:    string
  caps:      [string, string, string]
}

const MODES: ModeDef[] = [
  {
    id:        'upwind',
    labelKey:  'mode.upwind',
    descKey:   'mode.upwindDesc',
    accent:    '#14B8A6',
    stat:      '95',
    statLabel: 'YIELD',
    caps:      ['Instant strategic brief', 'Numerically anchored output', 'Live research synthesis'],
  },
  {
    id:        'synergy',
    labelKey:  'mode.synergy',
    descKey:   'mode.synergyDesc',
    accent:    '#C9A96E',
    stat:      '3×',
    statLabel: 'AGENTS',
    badge:     'WAR ROOM',
    caps:      ['3 specialist agents in parallel', 'Financial · Strategic · Operational', '70B synthesis — one verdict'],
  },
  {
    id:        'sail',
    labelKey:  'mode.sail',
    descKey:   'mode.sailDesc',
    accent:    '#14B8A6',
    stat:      '2×',
    statLabel: 'SPEED',
    badge:     'AI+',
    caps:      ['Intent-aware model routing', '8B + 70B speculative race', 'Adaptive depth calibration'],
  },
  {
    id:        'trim',
    labelKey:  'mode.trim',
    descKey:   'mode.trimDesc',
    accent:    '#14B8A6',
    stat:      '5–8',
    statLabel: 'PHASES',
    badge:     'NEW',
    caps:      ['Phased execution roadmap', 'Dependency chain mapping', 'KPI milestone structure'],
  },
  {
    id:        'catamaran',
    labelKey:  'mode.catamaran',
    descKey:   'mode.catamaranDesc',
    accent:    '#14B8A6',
    stat:      '2×',
    statLabel: 'TRACKS',
    badge:     'PRO',
    caps:      ['Dual-track growth model', 'Market + CX in parallel', 'Unified strategic keel'],
  },
]

// ── Icons (same SVG geometry, dark navy on white) ─────────────────────────────

const ICON_COLOR = '#1A3A4A'   // dark navy for icons on white cards

function UpwindIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3L12 19L4 19Z"  fill={ICON_COLOR} opacity="0.85"/>
      <path d="M12 3L12 19L20 12Z" fill={ICON_COLOR} opacity="0.25"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function SynergyIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3"    fill="#C9A96E" opacity="0.85"/>
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3"  fill={ICON_COLOR} opacity="0.7"/>
      <polygon points="12,11.7 16,14 16,18.7 12,21 8,18.7 8,14" fill="#C9A96E" opacity="0.55"/>
      <circle cx="12" cy="10" r="1.8" fill="#FFFFFF" opacity="0.95"/>
    </svg>
  )
}
function SailIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C18 5 22 11 20 19L12 19Z" fill={ICON_COLOR} opacity="0.85"/>
      <path d="M12 8C16 9 18 14 17 19L12 19Z" fill={ICON_COLOR} opacity="0.35"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="5" cy="6" r="1.8" fill={ICON_COLOR} opacity="0.5"/>
    </svg>
  )
}
function TrimIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="6" y1="4" x2="6" y2="20" stroke={ICON_COLOR} strokeWidth="1.3" strokeLinecap="round" opacity="0.28"/>
      <circle cx="6" cy="6"  r="2.2" fill={ICON_COLOR} opacity="0.9"/>
      <circle cx="6" cy="12" r="2.2" fill={ICON_COLOR} opacity="0.6"/>
      <circle cx="6" cy="18" r="2.2" fill={ICON_COLOR} opacity="0.35"/>
      <rect x="11" y="5"  width="9" height="2" rx="1" fill={ICON_COLOR} opacity="0.85"/>
      <rect x="11" y="11" width="7" height="2" rx="1" fill={ICON_COLOR} opacity="0.6"/>
      <rect x="11" y="17" width="5" height="2" rx="1" fill={ICON_COLOR} opacity="0.38"/>
    </svg>
  )
}
function CatamaranIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18L6 20L8 18"    stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 18L18 20L20 18" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6"  y1="14" x2="18" y2="14" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="4"  stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4L18 10L12 10Z" fill={ICON_COLOR} opacity="0.8"/>
      <line x1="2" y1="10" x2="5" y2="10" stroke={ICON_COLOR} strokeWidth="1" opacity="0.4"/>
      <line x1="2" y1="13" x2="4" y2="13" stroke={ICON_COLOR} strokeWidth="1" opacity="0.4"/>
    </svg>
  )
}

function ModeIcon({ id, size }: { id: SovereignMode; size?: number }) {
  if (id === 'upwind')    return <UpwindIcon    size={size} />
  if (id === 'synergy')   return <SynergyIcon   size={size} />
  if (id === 'sail')      return <SailIcon      size={size} />
  if (id === 'trim')      return <TrimIcon      size={size} />
  return                         <CatamaranIcon size={size} />
}

// ── The pill card (matches original screenshot exactly) ───────────────────────

const CARD_W = 176
const CARD_H = 420

interface PillCardProps {
  def:         ModeDef
  label:       string
  desc:        string
  companyName?: string
  direction:   1 | -1       // +1 = forward, -1 = backward (for exit/enter direction)
  onLaunch:    () => void
}

function PillCard({ def, label, desc, companyName, direction, onLaunch }: PillCardProps) {
  const { t } = useLanguage()
  const isSynergy = def.id === 'synergy'

  return (
    <motion.div
      key={def.id}
      initial={{ opacity: 0, x: direction * 80, scale: 0.94 }}
      animate={{ opacity: 1, x: 0,              scale: 1     }}
      exit={{    opacity: 0, x: direction * -80, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position:     'relative',
        width:        `${CARD_W}px`,
        height:       `${CARD_H}px`,
        borderRadius: '60px',
        background:   'rgba(255,255,255,0.94)',
        border:       '1.5px solid rgba(255,255,255,0.90)',
        backdropFilter:       'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: [
          '0 0 0 1px rgba(20,184,166,0.18)',
          '0 0 40px rgba(20,184,166,0.14)',
          '0 20px 60px rgba(0,0,0,0.12)',
          '0 4px 16px rgba(0,0,0,0.07)',
        ].join(', '),
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        padding:       '2.25rem 1.4rem 1.75rem',
        // stop click from bubbling to background (which rotates)
        zIndex:        10,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Breathing outer ring */}
      <motion.div
        animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.025, 1] }}
        transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
        style={{
          position:     'absolute',
          inset:        '-8px',
          borderRadius: '68px',
          border:       '1px solid rgba(20,184,166,0.35)',
          pointerEvents:'none',
        }}
      />

      {/* Badge */}
      {def.badge && (
        <span style={{
          position:      'absolute',
          top:           '-10px',
          right:         '20px',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.46rem',
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding:       '2px 8px',
          borderRadius:  '4px',
          background:    isSynergy ? '#C9A96E' : '#1A3A4A',
          color:         isSynergy ? '#0C0C0E' : '#FFFFFF',
        }}>
          {def.badge}
        </span>
      )}

      {/* Icon */}
      <ModeIcon id={def.id} size={36} />

      {/* Company name */}
      {companyName && (
        <span style={{
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontStyle:     'italic',
          fontSize:      '0.65rem',
          fontWeight:    600,
          color:         isSynergy ? '#9A6B00' : '#14B8A6',
          letterSpacing: '0.04em',
          marginTop:     '0.65rem',
          opacity:       0.8,
          textAlign:     'center',
        }}>
          {companyName}
        </span>
      )}

      {/* Mode name */}
      <h2 style={{
        fontFamily:    'Inter, sans-serif',
        fontSize:      '0.82rem',
        fontWeight:    800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color:         '#0F2435',
        margin:        `${companyName ? '0.15rem' : '0.75rem'} 0 0`,
        textAlign:     'center',
        lineHeight:    1.25,
      }}>
        {label}
      </h2>

      {/* Description */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.6rem',
        color:      '#4A6070',
        textAlign:  'center',
        lineHeight: 1.55,
        margin:     '0.55rem 0 0',
        padding:    '0 0.1rem',
      }}>
        {desc}
      </p>

      {/* Teal-mint accent divider */}
      <div style={{
        width:      '32px',
        height:     '1.5px',
        borderRadius: '1px',
        background: isSynergy
          ? 'linear-gradient(90deg, #C9A96E, #E8C87A)'
          : 'linear-gradient(90deg, #14B8A6, #2DD4BF)',
        margin:     '0.9rem 0',
        opacity:    0.7,
      }} />

      {/* Capabilities */}
      <ul style={{
        listStyle:     'none',
        padding:       0,
        margin:        0,
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.3rem',
        width:         '100%',
        alignItems:    'flex-start',
      }}>
        {def.caps.map(cap => (
          <li key={cap} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <span style={{
              width:        '4px',
              height:       '4px',
              borderRadius: '50%',
              background:   isSynergy ? '#C9A96E' : '#14B8A6',
              flexShrink:   0,
              marginTop:    '4px',
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.57rem',
              color:      '#3D5566',
              lineHeight: 1.45,
            }}>
              {cap}
            </span>
          </li>
        ))}
      </ul>

      {/* Stat */}
      <div style={{ textAlign: 'center', margin: '0.9rem 0 0' }}>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '1.9rem',
          fontWeight:    800,
          color:         isSynergy ? '#9A6B00' : '#0F2435',
          lineHeight:    1,
          letterSpacing: '-0.02em',
        }}>
          {def.stat}
          {def.statLabel === 'YIELD' && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.65, marginLeft: '1px' }}>%</span>
          )}
        </span>
        <p style={{
          margin:        '2px 0 0',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.46rem',
          fontWeight:    700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         '#94A3B8',
        }}>
          {def.statLabel}
        </p>
      </div>

      {/* BAŞLAT button — same navy dark button from original */}
      <motion.button
        type="button"
        onClick={onLaunch}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        style={{
          marginTop:     '1.1rem',
          padding:       '0.55rem 1.6rem',
          borderRadius:  '999px',
          border:        'none',
          background:    isSynergy
            ? 'linear-gradient(135deg, #7A5200, #9A6B00)'
            : '#1A3A4A',
          color:         '#FFFFFF',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.64rem',
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor:        'pointer',
          boxShadow:     isSynergy
            ? '0 4px 16px rgba(154,107,0,0.35)'
            : '0 4px 16px rgba(26,58,74,0.35)',
        }}
      >
        {t('nav.launch')} →
      </motion.button>
    </motion.div>
  )
}

// ── Ghost card (dim pill shown behind, left or right) ─────────────────────────

function GhostCard({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      style={{
        position:     'absolute',
        top:          '50%',
        [side]:       '-18px',
        transform:    `translateY(-50%) ${side === 'left' ? 'rotate(-4deg)' : 'rotate(4deg)'}`,
        width:        `${CARD_W}px`,
        height:       `${CARD_H}px`,
        borderRadius: '60px',
        background:   'rgba(255,255,255,0.55)',
        border:       '1px solid rgba(255,255,255,0.6)',
        backdropFilter: 'blur(8px)',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.07)',
        pointerEvents:'none',
        zIndex:       4,
      }}
    />
  )
}

// ── Dot navigation ────────────────────────────────────────────────────────────

function NavDots({
  total, active, onSelect,
}: { total: number; active: number; onSelect: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.button
          key={i}
          type="button"
          aria-label={`Mode ${i + 1}`}
          onClick={() => onSelect(i)}
          animate={{
            width:      i === active ? 20 : 6,
            background: i === active ? '#14B8A6' : 'rgba(20,184,166,0.35)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            height:       '6px',
            borderRadius: '999px',
            border:       'none',
            cursor:       'pointer',
            padding:      0,
          }}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SovereignDashboard({
  initialMode    = 'upwind',
  onModeSelect,
  confidenceScore = 0.95,
  processingMs,
  companyName,
  className = '',
}: SovereignDashboardProps) {
  const { t } = useLanguage()

  const initIdx                     = MODES.findIndex(m => m.id === initialMode)
  const [idx,       setIdx]         = useState(initIdx < 0 ? 0 : initIdx)
  const [direction, setDirection]   = useState<1 | -1>(1)
  const backgroundRef               = useRef<HTMLDivElement>(null)

  const goTo = useCallback((nextIdx: number, dir: 1 | -1) => {
    setDirection(dir)
    setIdx(nextIdx)
  }, [])

  const advance = useCallback(() => goTo((idx + 1) % MODES.length, 1), [idx, goTo])
  const retreat = useCallback(() => goTo((idx - 1 + MODES.length) % MODES.length, -1), [idx, goTo])

  // Clicking background: left third → retreat, rest → advance
  const handleBgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = backgroundRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    if (x < rect.width * 0.28) retreat()
    else advance()
  }, [advance, retreat])

  const def   = MODES[idx]
  const label = t(def.labelKey)
  const desc  = t(def.descKey)

  return (
    <div
      ref={backgroundRef}
      role="region"
      aria-label="Mode selection"
      className={className}
      onClick={handleBgClick}
      style={{
        position:       'relative',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        width:          '100%',
        background:     'rgba(8,9,13,0.62)',
        overflow:       'hidden',
        cursor:         'pointer',   // clicking bg rotates
        userSelect:     'none',
      }}
    >
      {/* Architectural grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      >
        <defs>
          <pattern id="sov-gr" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(45,212,191,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sov-gr)" />
      </svg>

      {/* Ambient colour wash behind the card */}
      <motion.div
        key={`glow-${def.id}`}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          position:     'absolute',
          top:          '10%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '480px',
          height:       '480px',
          borderRadius: '50%',
          background:   def.id === 'synergy'
            ? 'radial-gradient(ellipse, rgba(201,169,110,0.18) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(20,184,166,0.18) 0%, transparent 70%)',
          filter:       'blur(40px)',
          pointerEvents:'none',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0   }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:      'relative',
          textAlign:     'center',
          marginBottom:  '2.75rem',
          pointerEvents: 'none',   // header clicks fall through to bg rotate
        }}
      >
        {/* Teal–champagne hairline */}
        <div style={{
          width:        '80px',
          height:       '1px',
          background:   'linear-gradient(90deg, transparent 0%, #14B8A6 40%, #C9A96E 60%, transparent 100%)',
          margin:       '0 auto 1rem',
          opacity:      0.6,
        }} />

        {companyName && (
          <span style={{
            display:       'block',
            fontFamily:    '"Cormorant Garamond", Georgia, serif',
            fontStyle:     'italic',
            fontSize:      '0.72rem',
            fontWeight:    600,
            color:         '#C9A96E',
            letterSpacing: '0.05em',
            marginBottom:  '0.3rem',
            opacity:       0.85,
            textShadow:    '0 1px 8px rgba(0,0,0,0.9)',
          }}>
            {companyName}
          </span>
        )}

        <h1 style={{
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontSize:      'clamp(1.7rem, 3vw, 2.4rem)',
          fontWeight:    600,
          color:         '#FFFFFF',
          margin:        0,
          lineHeight:    1.1,
          letterSpacing: '-0.01em',
          textShadow:    '0 2px 16px rgba(0,0,0,0.9)',
        }}>
          Set Your Course
        </h1>

        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '0.66rem',
          color:      'rgba(255,255,255,0.55)',
          margin:     '0.4rem 0 0',
          letterSpacing: '0.01em',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}>
          Tap background to rotate · tap card to select
        </p>
      </motion.div>

      {/* ── Carousel stage ─────────────────────────────────────── */}
      <div
        style={{
          position:       'relative',
          width:          `${CARD_W}px`,
          height:         `${CARD_H}px`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        {/* Ghost cards peeking from behind */}
        <GhostCard side="left"  />
        <GhostCard side="right" />

        {/* Active pill card — AnimatePresence swaps content on mode change */}
        <AnimatePresence mode="wait" custom={direction}>
          <PillCard
            key={def.id}
            def={def}
            label={label}
            desc={desc}
            companyName={companyName}
            direction={direction}
            onLaunch={() => onModeSelect(def.id)}
          />
        </AnimatePresence>
      </div>

      {/* ── Chart Course CTA ───────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={e => { e.stopPropagation(); onModeSelect(def.id) }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop:      '2rem',
          padding:        '0.75rem 2.25rem',
          borderRadius:   '999px',
          border:         '1.5px solid rgba(20,184,166,0.60)',
          background:     'linear-gradient(135deg, rgba(20,184,166,0.28) 0%, rgba(8,9,13,0.88) 100%)',
          color:          '#FFFFFF',
          fontFamily:     'Inter, sans-serif',
          cursor:         'pointer',
          boxShadow:      '0 0 20px rgba(20,184,166,0.25), 0 6px 24px rgba(0,0,0,0.40)',
          pointerEvents:  'auto',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '0.15rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={def.id}
              initial={{ opacity: 0, y: 4  }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize:      '0.68rem',
                fontWeight:    700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {t('sovereign.startModePrefix')}{label}{t('sovereign.startModeSuffix')}
            </motion.span>
          </AnimatePresence>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M14 6l6 6-6 6" stroke="#14B8A6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontSize: '0.55rem', letterSpacing: '0.08em', color: 'rgba(20,184,166,0.75)', textTransform: 'uppercase' }}>
          {t('sovereign.goToChat')}
        </span>
      </motion.button>

      {/* ── Navigation dots ─────────────────────────────────────── */}
      <div
        style={{ marginTop: '1.25rem', pointerEvents: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <NavDots
          total={MODES.length}
          active={idx}
          onSelect={i => goTo(i, i > idx ? 1 : -1)}
        />
      </div>

      {/* ── Footer hint ─────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        aria-hidden
        style={{
          position:      'absolute',
          bottom:        '1.75rem',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.52rem',
          fontStyle:     'italic',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.28)',
          margin:        0,
          pointerEvents: 'none',
        }}
      >
        {idx + 1} / {MODES.length} — {label}
      </motion.p>
    </div>
  )
}

export default SovereignDashboard
