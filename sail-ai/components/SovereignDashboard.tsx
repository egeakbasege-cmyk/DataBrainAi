'use client'

/**
 * components/SovereignDashboard.tsx — 3-D Coverflow Mode Selector
 * ─────────────────────────────────────────────────────────────────────────────
 * Five tall pill-shaped cards arranged in a 3-D arc.
 * Clicking any card springs it forward to the center; others recede in depth.
 *
 * Visual model (5 positions, index 0 = selected / front):
 *
 *   pos 3 (far-left)  ·  pos 4 (near-left)  ·  pos 0 (CENTER)  ·  pos 1 (near-right)  ·  pos 2 (far-right)
 *
 * Per-slot visual properties are in SLOT_PROPS below.
 * No CSS overflow clipping — cards can extend outside the carousel div.
 *
 * Props interface is identical → chat/page.tsx needs zero changes.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage }             from '@/lib/i18n/LanguageContext'
import type { TranslationKey }     from '@/lib/i18n/translations'

// ── Exported types ────────────────────────────────────────────────────────────

export type SovereignMode = 'upwind' | 'synergy' | 'sail' | 'trim' | 'catamaran'

export interface SovereignDashboardProps {
  initialMode?:     SovereignMode
  onModeSelect:     (mode: SovereignMode) => void
  confidenceScore?: number
  processingMs?:    number
  companyName?:     string
  className?:       string
}

// ── Mode definitions ──────────────────────────────────────────────────────────

interface ModeDef {
  id:        SovereignMode
  labelKey:  TranslationKey
  descKey:   TranslationKey
  color:     string   // accent colour (icon, title, CTA, glow)
  tint:      string   // glassmorphic background tint (active card)
  glow:      string   // box-shadow glow colour
  border:    string   // active border colour
  badge?:    string
  badgeBg:   string
  badgeText: string
  caps:      [string, string, string]
  stat:      string   // large numeric shown in the center card
  statLabel: string
}

const MODES: ModeDef[] = [
  {
    id:        'upwind',
    labelKey:  'mode.upwind',
    descKey:   'mode.upwindDesc',
    color:     '#1A5276',
    tint:      'rgba(26,82,118,0.10)',
    glow:      'rgba(26,82,118,0.30)',
    border:    'rgba(26,82,118,0.35)',
    badgeBg:   'rgba(26,82,118,0.15)',
    badgeText: '#2980B9',
    caps:      ['Instant strategic brief', 'Numerically anchored output', 'Live research synthesis'],
    stat:      '95',
    statLabel: 'VERIM',
  },
  {
    id:        'synergy',
    labelKey:  'mode.synergy',
    descKey:   'mode.synergyDesc',
    color:     '#7A5200',
    tint:      'rgba(201,169,110,0.14)',
    glow:      'rgba(201,169,110,0.40)',
    border:    'rgba(201,169,110,0.45)',
    badge:     'WAR ROOM',
    badgeBg:   'rgba(201,169,110,0.18)',
    badgeText: '#9A6B00',
    caps:      ['3 specialist agents in parallel', 'Financial · Strategic · Operational lenses', '70B synthesis — one verdict'],
    stat:      '3×',
    statLabel: 'AGENTS',
  },
  {
    id:        'sail',
    labelKey:  'mode.sail',
    descKey:   'mode.sailDesc',
    color:     '#5B21B6',
    tint:      'rgba(124,58,237,0.10)',
    glow:      'rgba(124,58,237,0.30)',
    border:    'rgba(124,58,237,0.35)',
    badge:     'AI+',
    badgeBg:   'rgba(124,58,237,0.15)',
    badgeText: '#7C3AED',
    caps:      ['Intent-aware model routing', '8B + 70B speculative race', 'Adaptive depth calibration'],
    stat:      '2×',
    statLabel: 'SPEED',
  },
  {
    id:        'trim',
    labelKey:  'mode.trim',
    descKey:   'mode.trimDesc',
    color:     '#92400E',
    tint:      'rgba(180,83,9,0.10)',
    glow:      'rgba(180,83,9,0.30)',
    border:    'rgba(201,169,110,0.40)',
    badge:     'NEW',
    badgeBg:   'rgba(180,83,9,0.15)',
    badgeText: '#B45309',
    caps:      ['Phased execution roadmap', 'Dependency chain mapping', 'KPI milestone structure'],
    stat:      '5–8',
    statLabel: 'PHASES',
  },
  {
    id:        'catamaran',
    labelKey:  'mode.catamaran',
    descKey:   'mode.catamaranDesc',
    color:     '#78620A',
    tint:      'rgba(212,175,55,0.12)',
    glow:      'rgba(212,175,55,0.35)',
    border:    'rgba(212,175,55,0.40)',
    badge:     'PRO',
    badgeBg:   'rgba(212,175,55,0.18)',
    badgeText: '#92730A',
    caps:      ['Dual-track growth model', 'Market + CX in parallel', 'Unified strategic keel'],
    stat:      '2×',
    statLabel: 'TRACKS',
  },
]

// ── 3-D slot layout: 5 positions around the arc ───────────────────────────────
// Index 0 = center / selected (front)
// Index 1 = right-inner, 2 = right-outer
// Index 3 = left-outer,  4 = left-inner
// translateX is in px from carousel center; rotateY tilts the card in 3-D;
// scale and opacity give depth cueing.

interface SlotDef {
  x:       number  // translateX px (card center offset from carousel center)
  ry:      number  // rotateY degrees (positive = left edge toward viewer)
  scale:   number
  opacity: number
  zIndex:  number
  blur:    number  // backdrop-filter blur reduction for non-center cards
}

const SLOT_DEFS: SlotDef[] = [
  { x:    0, ry:   0, scale: 1.00, opacity: 1.00, zIndex: 10, blur: 0  }, // 0 – center
  { x:  225, ry: -22, scale: 0.80, opacity: 0.60, zIndex:  6, blur: 2  }, // 1 – near-right
  { x:  410, ry: -36, scale: 0.60, opacity: 0.30, zIndex:  3, blur: 4  }, // 2 – far-right
  { x: -410, ry:  36, scale: 0.60, opacity: 0.30, zIndex:  3, blur: 4  }, // 3 – far-left
  { x: -225, ry:  22, scale: 0.80, opacity: 0.60, zIndex:  6, blur: 2  }, // 4 – near-left
]

// For card at mode-index i when selectedIndex = s:
//   posSlot = (i - s + 5) % 5   →  into SLOT_DEFS
function getSlot(cardIdx: number, selectedIdx: number): SlotDef {
  return SLOT_DEFS[(cardIdx - selectedIdx + 5) % 5]
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function UpwindIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3L12 19L4 19Z"  fill={color} opacity="0.9"/>
      <path d="M12 3L12 19L20 12Z" fill={color} opacity="0.28"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function SynergyIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3"    fill={color} opacity="0.88"/>
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3"  fill="#C9A96E" opacity="0.75"/>
      <polygon points="12,11.7 16,14 16,18.7 12,21 8,18.7 8,14" fill={color} opacity="0.55"/>
      <circle cx="12" cy="10" r="1.8" fill="#FFFFFF" opacity="0.95"/>
    </svg>
  )
}
function SailIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C18 5 22 11 20 19L12 19Z" fill={color} opacity="0.9"/>
      <path d="M12 8C16 9 18 14 17 19L12 19Z" fill={color} opacity="0.38"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="5" cy="6" r="1.8" fill={color} opacity="0.6"/>
    </svg>
  )
}
function TrimIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="6" y1="4" x2="6" y2="20" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.3"/>
      <circle cx="6" cy="6"  r="2.2" fill={color} opacity="0.9"/>
      <circle cx="6" cy="12" r="2.2" fill={color} opacity="0.65"/>
      <circle cx="6" cy="18" r="2.2" fill={color} opacity="0.4"/>
      <rect x="11" y="5"  width="9" height="2" rx="1" fill={color} opacity="0.9"/>
      <rect x="11" y="11" width="7" height="2" rx="1" fill={color} opacity="0.65"/>
      <rect x="11" y="17" width="5" height="2" rx="1" fill={color} opacity="0.45"/>
    </svg>
  )
}
function CatamaranIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18L6 20L8 18"    stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 18L18 20L20 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6"  y1="14" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4L18 10L12 10Z" fill={color} opacity="0.85"/>
      <line x1="2" y1="10" x2="5" y2="10" stroke={color} strokeWidth="1" opacity="0.45"/>
      <line x1="2" y1="13" x2="4" y2="13" stroke={color} strokeWidth="1" opacity="0.45"/>
    </svg>
  )
}

function ModeIcon({ id, color, size }: { id: SovereignMode; color: string; size?: number }) {
  if (id === 'upwind')   return <UpwindIcon    color={color} size={size} />
  if (id === 'synergy')  return <SynergyIcon   color={color} size={size} />
  if (id === 'sail')     return <SailIcon      color={color} size={size} />
  if (id === 'trim')     return <TrimIcon      color={color} size={size} />
  return                        <CatamaranIcon color={color} size={size} />
}

// ── Architectural grid overlay ────────────────────────────────────────────────

function ArchGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <pattern id="sv-g" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(45,212,191,0.10)" strokeWidth="0.5"/>
        </pattern>
        <radialGradient id="sv-vign" cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)"   />
          <stop offset="100%" stopColor="rgba(200,240,235,0.20)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sv-g)" />
      <rect width="100%" height="100%" fill="url(#sv-vign)" />
    </svg>
  )
}

// ── Individual carousel card ──────────────────────────────────────────────────

const CARD_W = 170  // px
const CARD_H = 410  // px
const CARD_R = 56   // border-radius

interface CarouselCardProps {
  def:         ModeDef
  label:       string
  desc:        string
  slot:        SlotDef
  isCenter:    boolean
  companyName?: string
  confidenceScore: number
  processingMs?:  number
  onSelect:    () => void
  onLaunch:    () => void
}

function CarouselCard({
  def, label, desc, slot, isCenter, companyName,
  confidenceScore, onSelect, onLaunch,
}: CarouselCardProps) {
  const [hov, setHov] = useState(false)

  // Spring-animated transform values
  const springConf = { type: 'spring' as const, stiffness: 320, damping: 34 }

  return (
    <motion.div
      onClick={isCenter ? onLaunch : onSelect}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      animate={{
        x:       slot.x,
        rotateY: slot.ry,
        scale:   isCenter && hov ? 1.02 : slot.scale,
        opacity: slot.opacity,
        zIndex:  slot.zIndex,
      }}
      transition={springConf}
      style={{
        position:     'absolute',
        left:         `calc(50% - ${CARD_W / 2}px)`,
        top:          0,
        width:        `${CARD_W}px`,
        height:       `${CARD_H}px`,
        borderRadius: `${CARD_R}px`,
        cursor:       isCenter ? 'default' : 'pointer',
        // card face
        background:   isCenter
          ? `linear-gradient(170deg, rgba(255,255,255,0.96) 0%, ${def.tint} 55%, rgba(255,255,255,0.90) 100%)`
          : `rgba(255,255,255,${isCenter ? 0.94 : 0.70})`,
        border:       isCenter
          ? `2px solid rgba(255,255,255,0.85)`
          : `1px solid rgba(255,255,255,0.55)`,
        boxShadow:    isCenter
          ? `0 0 0 1px ${def.border}, 0 0 60px ${def.glow}, 0 24px 60px rgba(0,0,0,0.14), 0 6px 20px rgba(0,0,0,0.08)`
          : `0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)`,
        backdropFilter:       `blur(${isCenter ? 24 : 10 + slot.blur}px) saturate(160%)`,
        WebkitBackdropFilter: `blur(${isCenter ? 24 : 10 + slot.blur}px) saturate(160%)`,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        padding:      `${isCenter ? '2rem' : '1.75rem'} 1.25rem`,
        gap:          0,
        userSelect:   'none',
        transformOrigin: 'center center',
        willChange:   'transform, opacity',
        // outline on tab
        outline:      'none',
      }}
      role="button"
      aria-label={isCenter ? `Launch ${label}` : `Select ${label}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') isCenter ? onLaunch() : onSelect() }}
    >
      {/* Breathing glow ring — only on center card */}
      {isCenter && (
        <motion.div
          animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
          style={{
            position:      'absolute',
            inset:         '-6px',
            borderRadius:  `${CARD_R + 6}px`,
            border:        `1.5px solid ${def.color}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Badge */}
      {def.badge && (
        <span style={{
          position:      'absolute',
          top:           '-10px',
          right:         '16px',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.46rem',
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding:       '2px 8px',
          borderRadius:  '4px',
          background:    def.badgeBg,
          color:         def.badgeText,
          border:        `1px solid ${def.border}`,
          pointerEvents: 'none',
        }}>
          {def.badge}
        </span>
      )}

      {/* Icon */}
      <div style={{
        marginBottom:   isCenter ? '0.75rem' : '0.6rem',
        opacity:        isCenter ? 1 : 0.75,
        transition:     'opacity 0.3s',
      }}>
        <ModeIcon id={def.id} color={def.color} size={isCenter ? 40 : 30} />
      </div>

      {/* Company name (center only) */}
      {companyName && isCenter && (
        <span style={{
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontStyle:     'italic',
          fontSize:      '0.62rem',
          fontWeight:    600,
          color:         def.color,
          opacity:       0.65,
          letterSpacing: '0.04em',
          marginBottom:  '0.2rem',
          textAlign:     'center',
        }}>
          {companyName}
        </span>
      )}

      {/* Mode name */}
      <h2 style={{
        fontFamily:    'Inter, sans-serif',
        fontSize:      isCenter ? '0.78rem' : '0.65rem',
        fontWeight:    800,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color:         def.color,
        margin:        `0 0 ${isCenter ? '0.45rem' : '0.35rem'}`,
        textAlign:     'center',
        lineHeight:    1.2,
      }}>
        {label}
      </h2>

      {/* Description */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   isCenter ? '0.6rem' : '0.54rem',
        color:      '#475569',
        margin:     `0 0 ${isCenter ? '0.85rem' : '0.65rem'}`,
        lineHeight: 1.5,
        textAlign:  'center',
        opacity:    isCenter ? 1 : 0.75,
      }}>
        {desc}
      </p>

      {/* Divider */}
      <div style={{
        width:        '40px',
        height:       '1px',
        background:   `linear-gradient(90deg, transparent, ${def.color}66, transparent)`,
        marginBottom: isCenter ? '0.85rem' : '0.65rem',
      }} />

      {/* Capabilities */}
      <ul style={{
        listStyle:     'none',
        padding:       0,
        margin:        `0 0 ${isCenter ? '1rem' : '0.75rem'}`,
        width:         '100%',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.28rem',
      }}>
        {def.caps.map(cap => (
          <li key={cap} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <span style={{
              width:        '4px', height: '4px',
              borderRadius: '50%',
              background:   def.color,
              flexShrink:   0,
              marginTop:    '4px',
              opacity:      isCenter ? 0.8 : 0.55,
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   isCenter ? '0.58rem' : '0.51rem',
              color:      '#334155',
              lineHeight: 1.4,
              opacity:    isCenter ? 1 : 0.7,
            }}>
              {cap}
            </span>
          </li>
        ))}
      </ul>

      {/* Stat — shown on all cards but prominent on center */}
      <div style={{ textAlign: 'center', marginBottom: isCenter ? '1rem' : '0.75rem' }}>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      isCenter ? '2rem' : '1.4rem',
          fontWeight:    800,
          color:         def.color,
          lineHeight:    1,
          letterSpacing: '-0.02em',
        }}>
          {def.stat}
        </span>
        {def.statLabel !== def.stat && (
          <p style={{
            margin:        '2px 0 0',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.48rem',
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         '#94A3B8',
          }}>
            {def.statLabel}
          </p>
        )}
      </div>

      {/* CTA — visible on all cards; prominent on center */}
      {isCenter ? (
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onLaunch() }}
          whileHover={{ scale: 1.05, boxShadow: `0 6px 24px ${def.glow}` }}
          whileTap={{ scale: 0.95 }}
          style={{
            marginTop:     'auto',
            padding:       '0.55rem 1.5rem',
            borderRadius:  '999px',
            border:        'none',
            background:    def.color,
            color:         '#FFFFFF',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.65rem',
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            boxShadow:     `0 4px 16px ${def.glow}`,
          }}
        >
          Başlat →
        </motion.button>
      ) : (
        <div style={{
          marginTop:  'auto',
          fontFamily: 'Inter, sans-serif',
          fontSize:   '0.52rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:      def.color,
          opacity:    0.5,
        }}>
          Select
        </div>
      )}
    </motion.div>
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

  const initialIdx = MODES.findIndex(m => m.id === initialMode)
  const [selectedIdx, setSelectedIdx] = useState(initialIdx < 0 ? 0 : initialIdx)

  const handleSelect = useCallback((idx: number) => {
    setSelectedIdx(idx)
  }, [])

  const handleLaunch = useCallback(() => {
    onModeSelect(MODES[selectedIdx].id)
  }, [onModeSelect, selectedIdx])

  const activeDef = MODES[selectedIdx]

  return (
    <div
      role="region"
      aria-label="Mode selection"
      className={className}
      style={{
        position:       'relative',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        width:          '100%',
        background:     'linear-gradient(135deg, #c8f2ec 0%, #e8faf7 45%, #daedf8 100%)',
        overflow:       'hidden',
      }}
    >
      {/* Architectural grid */}
      <ArchGrid />

      {/* Ambient colour orb — shifts with selected mode */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`orb-${activeDef.id}`}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            position:     'absolute',
            top:          '5%',
            left:         '50%',
            transform:    'translateX(-50%)',
            width:        '600px',
            height:       '500px',
            borderRadius: '50%',
            background:   `radial-gradient(ellipse, ${activeDef.glow} 0%, transparent 65%)`,
            filter:       'blur(50px)',
            pointerEvents:'none',
          }}
        />
      </AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0   }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:      'relative',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          textAlign:     'center',
          marginBottom:  '3rem',
          gap:           '0.4rem',
        }}
      >
        {/* Champagne–Teal hairline */}
        <div style={{
          width:        '90px',
          height:       '1px',
          background:   'linear-gradient(90deg, transparent 0%, #C9A96E 35%, #14B8A6 65%, transparent 100%)',
          marginBottom: '0.55rem',
          opacity:      0.7,
        }} />

        {companyName && (
          <span style={{
            fontFamily:    '"Cormorant Garamond", Georgia, serif',
            fontStyle:     'italic',
            fontSize:      '0.72rem',
            fontWeight:    600,
            color:         '#9A6B00',
            letterSpacing: '0.05em',
            opacity:       0.85,
          }}>
            {companyName}
          </span>
        )}

        <h1 style={{
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontSize:      'clamp(1.9rem, 3.5vw, 2.8rem)',
          fontWeight:    600,
          color:         '#0C0C0E',
          margin:        0,
          lineHeight:    1.1,
          letterSpacing: '-0.01em',
        }}>
          Set Your Course
        </h1>

        <p style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.72rem',
          color:         '#475569',
          margin:        0,
          maxWidth:      '360px',
          lineHeight:    1.6,
          opacity:       0.75,
        }}>
          Select an analysis mode. Click any card to bring it forward.
        </p>
      </motion.div>

      {/* ── 3-D Carousel ────────────────────────────────────────── */}
      {/* perspective is set on the wrapper; cards use absolute positioning */}
      <div
        role="radiogroup"
        aria-label="Analysis modes"
        style={{
          position:    'relative',
          width:       `${CARD_W}px`,   // only the "center slot" — cards overflow via absolute
          height:      `${CARD_H}px`,
          perspective: '1100px',
          perspectiveOrigin: '50% 50%',
          // allow cards to render outside this box
          overflow:    'visible',
          flexShrink:  0,
        }}
      >
        {MODES.map((def, i) => {
          const slot    = getSlot(i, selectedIdx)
          const isCenter = i === selectedIdx
          return (
            <CarouselCard
              key={def.id}
              def={def}
              label={t(def.labelKey)}
              desc={t(def.descKey)}
              slot={slot}
              isCenter={isCenter}
              companyName={companyName}
              confidenceScore={confidenceScore}
              processingMs={processingMs}
              onSelect={() => handleSelect(i)}
              onLaunch={handleLaunch}
            />
          )
        })}
      </div>

      {/* ── Bottom CTA + mode-name label ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.4, duration: 0.45 }}
        style={{
          position:       'relative',
          marginTop:      '2.75rem',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '0.65rem',
        }}
      >
        {/* Big "Chart Course" CTA */}
        <motion.button
          type="button"
          onClick={handleLaunch}
          whileHover={{ scale: 1.04, boxShadow: `0 10px 36px ${activeDef.glow}` }}
          whileTap={{ scale: 0.96 }}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '0.6rem',
            padding:       '0.8rem 2.75rem',
            borderRadius:  '999px',
            border:        `1.5px solid ${activeDef.border}`,
            background:    '#0C0C0E',
            color:         '#FFFFFF',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.72rem',
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            boxShadow:     `0 6px 28px rgba(0,0,0,0.18), 0 0 0 1px ${activeDef.border}`,
            backdropFilter:'blur(8px)',
            transition:    'border-color 0.3s',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={activeDef.id}
              initial={{ opacity: 0, y: 5  }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}
            >
              <ModeIcon id={activeDef.id} color={activeDef.color} size={16} />
              CHART COURSE
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Active mode label under CTA */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeDef.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.56rem',
              fontStyle:     'italic',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         activeDef.color,
              margin:        0,
              opacity:       0.6,
              userSelect:    'none',
            }}
            aria-hidden
          >
            {t(activeDef.labelKey)} — click card · Başlat to launch
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Bottom fade vignette */}
      <div
        aria-hidden
        style={{
          position:      'absolute',
          bottom:        0,
          left:          0,
          right:         0,
          height:        '80px',
          background:    'linear-gradient(to top, rgba(200,242,236,0.6), transparent)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default SovereignDashboard
