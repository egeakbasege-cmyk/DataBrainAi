'use client'

/**
 * components/SovereignDashboard.tsx — Sovereign Mode Selection Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen glassmorphic fan layout for mode selection.
 *
 * Layout — five analysis modes arranged in a symmetrical arc:
 *   SAIL (-40°) · CUSTOM SYNERGY (-20°) · [ACTIVE CENTER] · TRIM (+20°) · CATAMARAN (+40°)
 *
 * Interaction model:
 *   • Click any fan card → that mode becomes selected; center panel content morphs.
 *   • Click the center CTA ("Başlat") → calls `onModeSelect(selectedMode)` and navigates.
 *   • Keyboard: Tab between cards; Enter/Space to select.
 *
 * i18n: fully wired to the LanguageContext — labels + descriptions switch with locale.
 *
 * Props:
 *   initialMode    — which mode is pre-selected (default: 'upwind')
 *   onModeSelect   — called when user commits to a mode
 *   confidenceScore — 0–1 float shown as efficiency in the center panel
 *   processingMs    — last response time shown as latency metric
 *   companyName     — optional brand name shown in the center sub-header
 */

import { useState, useCallback, useId } from 'react'
import { motion, AnimatePresence }       from 'framer-motion'
import { useLanguage }                   from '@/lib/i18n/LanguageContext'
import type { TranslationKey }           from '@/lib/i18n/translations'

// ── Mode type (mirrors ModeSelector, kept local to avoid circular deps) ────────

export type SovereignMode = 'upwind' | 'synergy' | 'sail' | 'trim' | 'catamaran'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SovereignDashboardProps {
  initialMode?:    SovereignMode
  onModeSelect:    (mode: SovereignMode) => void
  /** 0.0 – 1.0; displayed as % efficiency in the center panel. */
  confidenceScore?: number
  /** Last response latency in ms — shown as response speed metric. */
  processingMs?:    number
  /** Shown in the center sub-header (e.g. company/brand name). */
  companyName?:     string
  /** Extra Tailwind classes for the outermost wrapper. */
  className?:       string
}

// ── Fan slot definitions ───────────────────────────────────────────────────────
// Arc geometry: ±40° outer, ±20° inner, 0° center.
// translateY: outer cards dip slightly for a natural fan curvature.

interface FanSlot {
  mode:       SovereignMode
  rotate:     number   // CSS rotate degrees
  tx:         number   // translateX px
  ty:         number   // translateY px
  cardH:      number   // pill height px
  cardW:      number   // pill width px
  zIndex:     number
  badge?:     string
  badgeStyle: 'primary' | 'gold' | 'ghost'
}

const FAN_SLOTS: FanSlot[] = [
  {
    mode: 'sail',      rotate: -40, tx: -210, ty: 22,
    cardH: 338, cardW: 140, zIndex: 1, badge: 'AI+', badgeStyle: 'primary',
  },
  {
    mode: 'synergy',   rotate: -20, tx: -115, ty: -8,
    cardH: 358, cardW: 148, zIndex: 2, badge: 'SYN', badgeStyle: 'gold',
  },
  {
    mode: 'trim',      rotate:  20, tx:  115, ty: -8,
    cardH: 358, cardW: 148, zIndex: 2, badge: 'NEW', badgeStyle: 'gold',
  },
  {
    mode: 'catamaran', rotate:  40, tx:  210, ty: 22,
    cardH: 338, cardW: 140, zIndex: 1, badge: 'PRO', badgeStyle: 'gold',
  },
]

// ── Color palette per mode ─────────────────────────────────────────────────────

interface ModeTheme {
  primary:  string
  tint:     string    // for glassmorphic bg tint
  glow:     string    // box-shadow glow
  text:     string    // card text color
}

const MODE_THEME: Record<SovereignMode, ModeTheme> = {
  upwind:    { primary: '#1A5276', tint: 'rgba(26,82,118,0.18)',   glow: 'rgba(26,82,118,0.35)',   text: '#1A5276' },
  synergy:   { primary: '#9A6B00', tint: 'rgba(201,169,110,0.22)', glow: 'rgba(201,169,110,0.5)',  text: '#7A5200' },
  sail:      { primary: '#6D28D9', tint: 'rgba(109,40,217,0.18)',  glow: 'rgba(109,40,217,0.35)',  text: '#6D28D9' },
  trim:      { primary: '#92400E', tint: 'rgba(146,64,14,0.18)',   glow: 'rgba(201,169,110,0.4)',  text: '#92400E' },
  catamaran: { primary: '#92730A', tint: 'rgba(212,175,55,0.18)',  glow: 'rgba(212,175,55,0.45)',  text: '#78620A' },
}

// ── i18n key map ──────────────────────────────────────────────────────────────

const LABEL_KEY: Record<SovereignMode, TranslationKey> = {
  upwind:    'mode.upwind',
  synergy:   'mode.synergy',
  sail:      'mode.sail',
  trim:      'mode.trim',
  catamaran: 'mode.catamaran',
}

const DESC_KEY: Record<SovereignMode, TranslationKey> = {
  upwind:    'mode.upwindDesc',
  synergy:   'mode.synergyDesc',
  sail:      'mode.sailDesc',
  trim:      'mode.trimDesc',
  catamaran: 'mode.catamaranDesc',
}

// ── Capability bullets per mode ───────────────────────────────────────────────
// Three short, declarative capability statements shown in the center panel.

const MODE_CAPABILITIES: Record<SovereignMode, [string, string, string]> = {
  upwind:    ['Instant strategic brief', 'Numerically anchored output', 'Live research synthesis'],
  synergy:   ['3 specialist agents in parallel', 'Financial · Strategic · Operational lenses', '70B synthesis — one authoritative verdict'],
  sail:      ['Intent-aware routing', '8B + 70B speculative race', 'Adaptive depth calibration'],
  trim:      ['Phased execution roadmap', 'Dependency chain mapping', 'KPI milestone structure'],
  catamaran: ['Dual-track growth model', 'Market + CX in parallel', 'Unified strategic keel'],
}

// ── SVG Icon components (same geometry as ModeSelector) ───────────────────────

function UpwindIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3L12 19L4 19Z"                               fill={color} opacity="0.85"/>
      <path d="M12 3L12 19L20 12Z"                              fill={color} opacity="0.28"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function SailIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C18 5 22 11 20 19L12 19Z" fill={color} opacity="0.85"/>
      <path d="M12 8C16 9 18 14 17 19L12 19Z" fill={color} opacity="0.38"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="5" cy="6" r="1.8" fill={color} opacity="0.55"/>
    </svg>
  )
}

function TrimIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="6" y1="4" x2="6" y2="20" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.3"/>
      <circle cx="6" cy="6"  r="2.2" fill={color} opacity="0.9"/>
      <circle cx="6" cy="12" r="2.2" fill={color} opacity="0.65"/>
      <circle cx="6" cy="18" r="2.2" fill={color} opacity="0.4"/>
      <rect x="11" y="5"  width="9" height="2" rx="1" fill={color} opacity="0.85"/>
      <rect x="11" y="11" width="7" height="2" rx="1" fill={color} opacity="0.65"/>
      <rect x="11" y="17" width="5" height="2" rx="1" fill={color} opacity="0.45"/>
    </svg>
  )
}

function CatamaranIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18L6 20L8 18"   stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 18L18 20L20 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6"  y1="14" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4L18 10L12 10Z" fill={color} opacity="0.8"/>
      <line x1="2" y1="10" x2="5" y2="10" stroke={color} strokeWidth="1" opacity="0.45"/>
      <line x1="2" y1="13" x2="4" y2="13" stroke={color} strokeWidth="1" opacity="0.45"/>
    </svg>
  )
}

/** Interlocking hexagons — war-room / Custom Synergy icon. */
function SynergyIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Left hex */}
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3"   fill={color} opacity="0.85"/>
      {/* Right hex */}
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3" fill={color} opacity="0.75"/>
      {/* Bottom-center hex */}
      <polygon points="12,11.7 16,14 16,18.7 12,21 8,18.7 8,14" fill={color} opacity="0.60"/>
      {/* Centre convergence dot */}
      <circle cx="12" cy="10" r="1.8" fill="#FFFFFF" opacity="0.9"/>
    </svg>
  )
}

function ModeIcon({ mode, color, size }: { mode: SovereignMode; color: string; size?: number }) {
  if (mode === 'upwind')   return <UpwindIcon   color={color} size={size} />
  if (mode === 'synergy')  return <SynergyIcon  color={color} size={size} />
  if (mode === 'sail')     return <SailIcon     color={color} size={size} />
  if (mode === 'trim')     return <TrimIcon     color={color} size={size} />
  return <CatamaranIcon color={color} size={size} />
}

// ── Background grid (replaces external SVG wireframe) ─────────────────────────

function ArchitecturalGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <defs>
        <pattern id="sov-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(45,212,191,0.11)" strokeWidth="0.5"/>
        </pattern>
        <radialGradient id="sov-vignette" cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)"   />
          <stop offset="100%" stopColor="rgba(200,240,235,0.25)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sov-grid)" />
      <rect width="100%" height="100%" fill="url(#sov-vignette)" />
      {/* Diagonal accent lines */}
      <line x1="0"    y1="0"    x2="30%"  y2="50%"  stroke="rgba(45,212,191,0.05)" strokeWidth="1"/>
      <line x1="100%" y1="0"    x2="70%"  y2="50%"  stroke="rgba(45,212,191,0.05)" strokeWidth="1"/>
      <line x1="0"    y1="100%" x2="40%"  y2="50%"  stroke="rgba(45,212,191,0.04)" strokeWidth="1"/>
      <line x1="100%" y1="100%" x2="60%"  y2="50%"  stroke="rgba(45,212,191,0.04)" strokeWidth="1"/>
    </svg>
  )
}

// ── Badge component ───────────────────────────────────────────────────────────

function Badge({ label, style: variant }: { label: string; style: 'primary' | 'gold' | 'ghost' }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#1E293B', color: '#F8FAFC' },
    gold:    { background: '#C9A96E', color: '#1A0F00' },
    ghost:   { background: 'rgba(255,255,255,0.55)', color: '#475569', border: '1px solid rgba(255,255,255,0.6)' },
  }
  return (
    <span style={{
      position:      'absolute',
      top:           '-9px',
      right:         '16px',
      fontFamily:    'Inter, sans-serif',
      fontSize:      '0.48rem',
      fontWeight:    700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding:       '2px 8px',
      borderRadius:  '3px',
      whiteSpace:    'nowrap',
      pointerEvents: 'none',
      ...styles[variant],
    }}>
      {label}
    </span>
  )
}

// ── Fan card (side slots) ─────────────────────────────────────────────────────

interface FanCardProps {
  slot:      FanSlot
  isActive:  boolean
  onClick:   () => void
  label:     string
}

function FanCard({ slot, isActive, onClick, label }: FanCardProps) {
  const theme   = MODE_THEME[slot.mode]
  const [hover, setHover] = useState(false)

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      aria-label={`Select ${label} mode`}
      onClick={onClick}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      animate={{
        scale:    hover ? 1.04 : 1,
        opacity:  isActive ? 1 : (hover ? 0.9 : 0.72),
      }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{
        position:        'absolute',
        width:           `${slot.cardW}px`,
        height:          `${slot.cardH}px`,
        borderRadius:    '56px',
        border:          isActive
          ? `2px solid ${theme.primary}66`
          : `1px solid rgba(255,255,255,0.45)`,
        background:      isActive
          ? `linear-gradient(160deg, ${theme.tint}, rgba(255,255,255,0.55))`
          : 'rgba(255,255,255,0.28)',
        backdropFilter:  'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow:       isActive
          ? `0 0 0 1px ${theme.primary}22, 0 8px 32px ${theme.glow}, 0 2px 8px rgba(0,0,0,0.06)`
          : '0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        transform:       `rotate(${slot.rotate}deg) translate(${slot.tx}px, ${slot.ty}px)`,
        transformOrigin: 'center bottom',
        zIndex:          slot.zIndex + (isActive ? 2 : 0),
        cursor:          'pointer',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'flex-start',
        paddingTop:      '2.25rem',
        gap:             '0.5rem',
        outline:         'none',
      }}
    >
      {slot.badge && <Badge label={slot.badge} style={slot.badgeStyle} />}

      {/* Selected ring indicator */}
      {isActive && (
        <motion.span
          layoutId="fan-active-ring"
          style={{
            position:      'absolute',
            inset:         '-4px',
            borderRadius:  '60px',
            border:        `2px solid ${theme.primary}`,
            pointerEvents: 'none',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}

      {/* Icon — counter-rotate to stay upright */}
      <span style={{ transform: `rotate(${-slot.rotate}deg)` }}>
        <ModeIcon
          mode={slot.mode}
          color={isActive ? theme.primary : '#64748B'}
          size={32}
        />
      </span>

      {/* Label — counter-rotate to stay upright */}
      <span style={{
        transform:     `rotate(${-slot.rotate}deg)`,
        fontFamily:    'Inter, sans-serif',
        fontSize:      '0.6rem',
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         isActive ? theme.primary : '#64748B',
        textAlign:     'center',
        maxWidth:      '80px',
        lineHeight:    1.3,
        padding:       '0 4px',
      }}>
        {label}
      </span>

      {/* Active tick */}
      {isActive && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            transform:   `rotate(${-slot.rotate}deg)`,
            marginTop:   '4px',
            width:       '18px',
            height:      '18px',
            borderRadius: '50%',
            background:  theme.primary,
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.span>
      )}
    </motion.button>
  )
}

// ── Center panel (active mode detail) ────────────────────────────────────────

interface CenterPanelProps {
  mode:            SovereignMode
  label:           string
  description:     string
  confidenceScore: number
  processingMs?:   number
  companyName?:    string
  onLaunch:        () => void
}

function CenterPanel({
  mode, label, description, confidenceScore, processingMs, companyName, onLaunch,
}: CenterPanelProps) {
  const theme        = MODE_THEME[mode]
  const capabilities = MODE_CAPABILITIES[mode]
  const efficiencyPct = Math.round(confidenceScore * 100)

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: -8, scale: 0.96  }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        position:        'absolute',
        width:           '180px',
        height:          '424px',
        borderRadius:    '90px',
        border:          `3px solid rgba(255,255,255,0.82)`,
        background:      `linear-gradient(170deg,
          rgba(255,255,255,0.94) 0%,
          ${theme.tint}          40%,
          rgba(255,255,255,0.92) 100%
        )`,
        backdropFilter:  'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow:       `
          0 0 0 1px rgba(255,255,255,0.6),
          0 0 60px ${theme.glow},
          0 20px 60px rgba(0,0,0,0.10),
          0 4px 16px rgba(0,0,0,0.06)
        `,
        zIndex:          20,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '0.1rem',
        transform:       'scale(1.05)',
        padding:         '2.25rem 1.5rem',
      }}
    >
      {/* Breathing glow ring */}
      <motion.div
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
        style={{
          position:     'absolute',
          inset:        '-8px',
          borderRadius: '92px',
          border:       `1.5px solid ${theme.primary}`,
          opacity:       0.35,
          pointerEvents: 'none',
        }}
      />

      {/* Icon */}
      <ModeIcon mode={mode} color={theme.primary} size={44} />

      {/* Company name (if set) */}
      {companyName && (
        <span style={{
          marginTop:     '0.75rem',
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontStyle:     'italic',
          fontSize:      '0.65rem',
          fontWeight:    600,
          color:         theme.primary,
          opacity:       0.7,
          letterSpacing: '0.04em',
          textAlign:     'center',
        }}>
          {companyName}
        </span>
      )}

      {/* Mode name */}
      <h2 style={{
        marginTop:     companyName ? '0.15rem' : '0.75rem',
        fontFamily:    'Inter, sans-serif',
        fontSize:      '0.85rem',
        fontWeight:    800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         theme.primary,
        textAlign:     'center',
        lineHeight:    1.25,
        margin:        `${companyName ? '0.15' : '0.75'}rem 0 0`,
      }}>
        {label}
      </h2>

      {/* Description */}
      <p style={{
        marginTop:  '0.5rem',
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.58rem',
        lineHeight: 1.5,
        color:      '#475569',
        textAlign:  'center',
        padding:    '0 0.25rem',
      }}>
        {description}
      </p>

      {/* Divider */}
      <div style={{
        margin:     '0.75rem 0',
        width:      '40px',
        height:     '1px',
        background: `linear-gradient(90deg, transparent, ${theme.primary}66, transparent)`,
      }} />

      {/* Capability list */}
      <ul style={{
        listStyle: 'none',
        padding:   0,
        margin:    '0.9rem 0 0',
        width:     '100%',
        display:   'flex',
        flexDirection: 'column',
        gap:       '0.3rem',
      }}>
        {capabilities.map(cap => (
          <li
            key={cap}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '0.35rem',
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.55rem',
              color:      '#334155',
              lineHeight: 1.4,
            }}
          >
            <span style={{
              width:       '5px',
              height:      '5px',
              borderRadius: '50%',
              background:  theme.primary,
              flexShrink:  0,
              opacity:     0.75,
            }} />
            {cap}
          </li>
        ))}
      </ul>

      {/* Stats row */}
      <div style={{
        marginTop:      '1rem',
        display:        'flex',
        gap:            '0.75rem',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        {/* Efficiency */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '1.4rem',
            fontWeight: 800,
            color:      theme.primary,
            lineHeight: 1,
          }}>
            {efficiencyPct}
            <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.7 }}>%</span>
          </span>
          <p style={{
            margin:        0,
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.48rem',
            fontWeight:    600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         '#94A3B8',
            marginTop:     '1px',
          }}>
            Verim
          </p>
        </div>

        {/* Separator */}
        {processingMs !== undefined && (
          <>
            <div style={{ width: '1px', height: '28px', background: `${theme.primary}33` }} />
            {/* Response speed */}
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   '1.4rem',
                fontWeight: 800,
                color:      theme.primary,
                lineHeight: 1,
              }}>
                {processingMs < 1000
                  ? `${processingMs}`
                  : `${(processingMs / 1000).toFixed(1)}s`}
                {processingMs < 1000 && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.7 }}>ms</span>
                )}
              </span>
              <p style={{
                margin:        0,
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.48rem',
                fontWeight:    600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         '#94A3B8',
                marginTop:     '1px',
              }}>
                Hız
              </p>
            </div>
          </>
        )}
      </div>

      {/* CTA button */}
      <motion.button
        type="button"
        onClick={onLaunch}
        whileHover={{ scale: 1.04 }}
        whileTap={{  scale: 0.97 }}
        style={{
          marginTop:     '1.25rem',
          padding:       '0.55rem 1.5rem',
          borderRadius:  '999px',
          border:        'none',
          background:    theme.primary,
          color:         '#ffffff',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.62rem',
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor:        'pointer',
          boxShadow:     `0 4px 16px ${theme.glow}`,
        }}
      >
        Başlat →
      </motion.button>
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
  const { t }                   = useLanguage()
  const [selected, setSelected] = useState<SovereignMode>(initialMode)
  const descId                  = useId()

  const handleSelect = useCallback((mode: SovereignMode) => {
    setSelected(mode)
  }, [])

  const handleLaunch = useCallback(() => {
    onModeSelect(selected)
  }, [onModeSelect, selected])

  return (
    <div
      role="region"
      aria-label="Mode selection dashboard"
      className={className}
      style={{
        position:   'relative',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight:  '100vh',
        width:      '100%',
        background: 'linear-gradient(135deg, #c8f2ec 0%, #e8faf7 45%, #daedf8 100%)',
        overflow:   'hidden',
      }}
    >
      {/* Background architectural grid */}
      <ArchitecturalGrid />

      {/* ── Ambient glow orb ─── */}
      <div
        aria-hidden
        style={{
          position:     'absolute',
          width:        '500px',
          height:       '500px',
          borderRadius: '50%',
          background:   `radial-gradient(circle, ${MODE_THEME[selected].glow} 0%, transparent 70%)`,
          opacity:      0.35,
          transition:   'background 0.6s ease',
          pointerEvents: 'none',
        }}
      />

      {/* ── Fan container ─── */}
      <div
        role="radiogroup"
        aria-label="Analysis mode"
        aria-describedby={descId}
        style={{
          position: 'relative',
          width:    '640px',
          height:   '520px',
          display:  'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p id={descId} className="sr-only">
          Select an analysis mode. Use arrow keys to navigate, Enter to select.
        </p>

        {/* ── Fan side cards ─── */}
        {FAN_SLOTS.map(slot => (
          <FanCard
            key={slot.mode}
            slot={slot}
            isActive={selected === slot.mode}
            onClick={() => handleSelect(slot.mode)}
            label={t(LABEL_KEY[slot.mode])}
          />
        ))}

        {/* ── Center panel (animated on mode change) ─── */}
        <AnimatePresence mode="wait">
          <CenterPanel
            key={selected}
            mode={selected}
            label={t(LABEL_KEY[selected])}
            description={t(DESC_KEY[selected])}
            confidenceScore={confidenceScore}
            processingMs={processingMs}
            companyName={companyName}
            onLaunch={handleLaunch}
          />
        </AnimatePresence>
      </div>

      {/* ── Footer hint ─── */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{
          position:      'absolute',
          bottom:        '2.5rem',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.58rem',
          fontStyle:     'italic',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         '#94A3B8',
          userSelect:    'none',
        }}
        aria-hidden
      >
        Bir modu seç · Başlat'a bas
      </motion.p>
    </div>
  )
}

export default SovereignDashboard
