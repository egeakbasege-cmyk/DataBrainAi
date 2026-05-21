'use client'

/**
 * components/SovereignDashboard.tsx — Sovereign Mode Selection Screen
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen pre-conversation mode picker that integrates with the dark chat
 * UI. Replaces the broken fan layout with a clean, premium card grid.
 *
 * Layout:
 *   – Dark (#0C0C0E) background with subtle teal grid, matching chat page
 *   – 5 mode cards in a responsive grid (3+2 or 2+3)
 *   – Selected card: glowing border + mode-colour tint
 *   – "Chart Course" CTA launches selected mode
 *
 * Props (unchanged — chat/page.tsx requires no edits):
 *   initialMode     — pre-selected mode (default: 'upwind')
 *   onModeSelect    — called when user commits a mode
 *   confidenceScore — not rendered but accepted for compat
 *   processingMs    — not rendered but accepted for compat
 *   companyName     — brand name shown in header
 *   className       — extra class on root div
 */

import { useState, useCallback }  from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage }             from '@/lib/i18n/LanguageContext'
import type { TranslationKey }     from '@/lib/i18n/translations'

// ── Mode type ─────────────────────────────────────────────────────────────────

export type SovereignMode = 'upwind' | 'synergy' | 'sail' | 'trim' | 'catamaran'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SovereignDashboardProps {
  initialMode?:     SovereignMode
  onModeSelect:     (mode: SovereignMode) => void
  confidenceScore?: number  // accepted for compat; not rendered
  processingMs?:    number  // accepted for compat; not rendered
  companyName?:     string
  className?:       string
}

// ── Mode catalogue ────────────────────────────────────────────────────────────

interface ModeDef {
  id:           SovereignMode
  labelKey:     TranslationKey
  descKey:      TranslationKey
  color:        string   // accent / border / glow
  bg:           string   // card tint when active
  border:       string   // card border when active
  glow:         string   // box-shadow glow when active
  badge?:       string
  badgeBg:      string
  badgeColor:   string
  capabilities: [string, string, string]
}

const MODES: ModeDef[] = [
  {
    id:           'upwind',
    labelKey:     'mode.upwind',
    descKey:      'mode.upwindDesc',
    color:        '#4E91D0',
    bg:           'rgba(26,82,118,0.14)',
    border:       'rgba(78,145,208,0.55)',
    glow:         'rgba(26,82,118,0.25)',
    badgeBg:      'rgba(26,82,118,0.25)',
    badgeColor:   '#7DB9E8',
    capabilities: [
      'Instant strategic brief',
      'Numerically anchored output',
      'Live research synthesis',
    ],
  },
  {
    id:           'synergy',
    labelKey:     'mode.synergy',
    descKey:      'mode.synergyDesc',
    color:        '#C9A96E',
    bg:           'rgba(201,169,110,0.14)',
    border:       'rgba(201,169,110,0.55)',
    glow:         'rgba(201,169,110,0.25)',
    badge:        'WAR ROOM',
    badgeBg:      'rgba(201,169,110,0.2)',
    badgeColor:   '#C9A96E',
    capabilities: [
      '3 specialist agents in parallel',
      'Financial · Strategic · Operational lenses',
      '70B synthesis — one authoritative verdict',
    ],
  },
  {
    id:           'sail',
    labelKey:     'mode.sail',
    descKey:      'mode.sailDesc',
    color:        '#9D72F0',
    bg:           'rgba(124,58,237,0.14)',
    border:       'rgba(157,114,240,0.55)',
    glow:         'rgba(124,58,237,0.25)',
    badge:        'AI+',
    badgeBg:      'rgba(124,58,237,0.25)',
    badgeColor:   '#C4A8FF',
    capabilities: [
      'Intent-aware model routing',
      '8B + 70B speculative race',
      'Adaptive depth calibration',
    ],
  },
  {
    id:           'trim',
    labelKey:     'mode.trim',
    descKey:      'mode.trimDesc',
    color:        '#E8A045',
    bg:           'rgba(180,83,9,0.14)',
    border:       'rgba(201,169,110,0.55)',
    glow:         'rgba(201,169,110,0.22)',
    badge:        'NEW',
    badgeBg:      'rgba(180,83,9,0.25)',
    badgeColor:   '#F4C47D',
    capabilities: [
      'Phased execution roadmap',
      'Dependency chain mapping',
      'KPI milestone structure',
    ],
  },
  {
    id:           'catamaran',
    labelKey:     'mode.catamaran',
    descKey:      'mode.catamaranDesc',
    color:        '#D4AF37',
    bg:           'rgba(212,175,55,0.14)',
    border:       'rgba(212,175,55,0.55)',
    glow:         'rgba(212,175,55,0.25)',
    badge:        'PRO',
    badgeBg:      'rgba(212,175,55,0.22)',
    badgeColor:   '#F0D060',
    capabilities: [
      'Dual-track growth model',
      'Market + CX in parallel',
      'Unified strategic keel',
    ],
  },
]

// ── Icons (same SVG geometry as ModeSelector) ─────────────────────────────────

function UpwindIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3L12 19L4 19Z"  fill={color} opacity="0.85"/>
      <path d="M12 3L12 19L20 12Z" fill={color} opacity="0.28"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function SynergyIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3"    fill={color} opacity="0.85"/>
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3"  fill="#C9A96E" opacity="0.70"/>
      <polygon points="12,11.7 16,14 16,18.7 12,21 8,18.7 8,14" fill={color} opacity="0.55"/>
      <circle cx="12" cy="10" r="1.8" fill="#FFFFFF" opacity="0.9"/>
    </svg>
  )
}
function SailIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C18 5 22 11 20 19L12 19Z" fill={color} opacity="0.85"/>
      <path d="M12 8C16 9 18 14 17 19L12 19Z" fill={color} opacity="0.38"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="5" cy="6" r="1.8" fill={color} opacity="0.55"/>
    </svg>
  )
}
function TrimIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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
function CatamaranIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function ModeIconSwitch({ id, color }: { id: SovereignMode; color: string }) {
  if (id === 'upwind')    return <UpwindIcon    color={color} />
  if (id === 'synergy')   return <SynergyIcon   color={color} />
  if (id === 'sail')      return <SailIcon      color={color} />
  if (id === 'trim')      return <TrimIcon      color={color} />
  return <CatamaranIcon color={color} />
}

// ── Single mode card ──────────────────────────────────────────────────────────

interface ModeCardProps {
  def:      ModeDef
  label:    string
  desc:     string
  isActive: boolean
  onClick:  () => void
  onLaunch: () => void
  delay:    number
}

function ModeCard({ def, label, desc, isActive, onClick, onLaunch, delay }: ModeCardProps) {
  const [hovered, setHovered] = useState(false)
  const lit = isActive || hovered

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      aria-label={`Select ${label} mode`}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'flex-start',
        gap:           0,
        width:         '100%',
        padding:       '1.5rem',
        borderRadius:  '14px',
        border:        isActive
          ? `1.5px solid ${def.border}`
          : `1px solid ${hovered ? def.border : 'rgba(255,255,255,0.08)'}`,
        background:    isActive
          ? def.bg
          : hovered
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.025)',
        backdropFilter:  'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow:     isActive
          ? `0 0 0 1px ${def.border}, 0 8px 32px ${def.glow}, 0 2px 8px rgba(0,0,0,0.3)`
          : hovered
            ? `0 4px 24px rgba(0,0,0,0.2)`
            : `0 2px 12px rgba(0,0,0,0.15)`,
        cursor:        'pointer',
        textAlign:     'left',
        outline:       'none',
        transition:    'background 0.2s, border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Badge */}
      {def.badge && (
        <span style={{
          position:      'absolute',
          top:           '12px',
          right:         '12px',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.48rem',
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding:       '2px 7px',
          borderRadius:  '4px',
          background:    def.badgeBg,
          color:         def.badgeColor,
          border:        `1px solid ${def.border}`,
        }}>
          {def.badge}
        </span>
      )}

      {/* Active selection ring */}
      {isActive && (
        <motion.span
          layoutId="sov-active-ring"
          style={{
            position:      'absolute',
            inset:         '-2px',
            borderRadius:  '15px',
            border:        `2px solid ${def.color}`,
            opacity:       0.6,
            pointerEvents: 'none',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}

      {/* Icon */}
      <div style={{
        width:        '48px',
        height:       '48px',
        borderRadius: '12px',
        background:   lit ? def.bg : 'rgba(255,255,255,0.05)',
        border:       `1px solid ${lit ? def.border : 'rgba(255,255,255,0.08)'}`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        marginBottom:  '1rem',
        transition:    'background 0.2s, border-color 0.2s',
        flexShrink:    0,
      }}>
        <ModeIconSwitch id={def.id} color={lit ? def.color : 'rgba(255,255,255,0.35)'} />
      </div>

      {/* Mode name */}
      <h3 style={{
        fontFamily:    'Inter, sans-serif',
        fontSize:      '0.78rem',
        fontWeight:    700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color:         lit ? def.color : 'rgba(255,255,255,0.72)',
        margin:        '0 0 0.35rem',
        lineHeight:    1.2,
        transition:    'color 0.2s',
      }}>
        {label}
      </h3>

      {/* Description */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.68rem',
        color:      'rgba(255,255,255,0.45)',
        margin:     '0 0 1rem',
        lineHeight: 1.5,
        flex:       1,
      }}>
        {desc}
      </p>

      {/* Divider */}
      <div style={{
        width:      '100%',
        height:     '1px',
        background: lit
          ? `linear-gradient(90deg, ${def.color}44, transparent)`
          : 'rgba(255,255,255,0.06)',
        marginBottom: '0.85rem',
        transition:   'background 0.2s',
      }} />

      {/* Capabilities */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}>
        {def.capabilities.map(cap => (
          <li key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width:        '4px',
              height:       '4px',
              borderRadius: '50%',
              background:   lit ? def.color : 'rgba(255,255,255,0.25)',
              flexShrink:   0,
              transition:   'background 0.2s',
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.6rem',
              color:      'rgba(255,255,255,0.42)',
              lineHeight: 1.4,
            }}>
              {cap}
            </span>
          </li>
        ))}
      </ul>

      {/* Select indicator — bottom row */}
      <div style={{
        marginTop:      '1.25rem',
        width:          '100%',
        display:        'flex',
        alignItems:     'center',
        justifyContent: isActive ? 'space-between' : 'flex-end',
      }}>
        {isActive && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.55rem',
              fontWeight:    700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         def.color,
            }}
          >
            ◈ Selected
          </motion.span>
        )}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.6rem',
          fontWeight:    600,
          color:         lit ? def.color : 'rgba(255,255,255,0.2)',
          letterSpacing: '0.04em',
          transition:    'color 0.2s',
        }}>
          {isActive ? 'Ready →' : 'Select'}
        </span>
      </div>
    </motion.button>
  )
}

// ── Background grid ───────────────────────────────────────────────────────────

function DarkGrid() {
  return (
    <div
      aria-hidden
      style={{
        position:        'absolute',
        inset:           0,
        backgroundImage: 'linear-gradient(rgba(45,212,191,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.045) 1px, transparent 1px)',
        backgroundSize:  '60px 60px',
        pointerEvents:   'none',
      }}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SovereignDashboard({
  initialMode = 'upwind',
  onModeSelect,
  companyName,
  className = '',
}: SovereignDashboardProps) {
  const { t }                   = useLanguage()
  const [selected, setSelected] = useState<SovereignMode>(initialMode)

  const handleSelect = useCallback((mode: SovereignMode) => setSelected(mode), [])
  const handleLaunch = useCallback(() => onModeSelect(selected), [onModeSelect, selected])

  const activeDef = MODES.find(m => m.id === selected)!

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
        background:     '#0C0C0E',
        overflow:       'hidden',
        padding:        '2rem 1.5rem',
      }}
    >
      {/* Background grid */}
      <DarkGrid />

      {/* Ambient glow behind selected mode */}
      <motion.div
        key={selected}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position:     'absolute',
          top:          '20%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '600px',
          height:       '400px',
          borderRadius: '50%',
          background:   `radial-gradient(ellipse, ${activeDef.glow} 0%, transparent 70%)`,
          pointerEvents: 'none',
          filter:       'blur(40px)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:       'relative',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          marginBottom:   '3rem',
          textAlign:      'center',
        }}
      >
        {/* Gold × Teal hairline */}
        <div style={{
          width:      '80px',
          height:     '1px',
          background: 'linear-gradient(90deg, transparent, #C9A96E 40%, #14B8A6 60%, transparent)',
          marginBottom: '1.25rem',
          opacity:    0.6,
        }} />

        {companyName && (
          <span style={{
            fontFamily:    '"Cormorant Garamond", Georgia, serif',
            fontStyle:     'italic',
            fontSize:      '0.7rem',
            fontWeight:    600,
            color:         '#C9A96E',
            letterSpacing: '0.06em',
            marginBottom:  '0.35rem',
            opacity:       0.8,
          }}>
            {companyName}
          </span>
        )}

        <h1 style={{
          fontFamily:    '"Cormorant Garamond", Georgia, serif',
          fontSize:      'clamp(1.6rem, 3vw, 2.4rem)',
          fontWeight:    600,
          color:         '#FFFFFF',
          margin:        '0 0 0.5rem',
          lineHeight:    1.15,
          letterSpacing: '-0.01em',
        }}>
          Set Your Course
        </h1>

        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '0.72rem',
          color:      'rgba(255,255,255,0.38)',
          margin:     0,
          maxWidth:   '360px',
          lineHeight: 1.6,
          letterSpacing: '0.02em',
        }}>
          Choose an analysis mode. Each mode routes your query through a different intelligence architecture.
        </p>
      </motion.div>

      {/* ── Mode grid ──────────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label="Analysis modes"
        style={{
          position:             'relative',
          display:              'grid',
          gridTemplateColumns:  'repeat(auto-fit, minmax(220px, 1fr))',
          gap:                  '0.85rem',
          width:                '100%',
          maxWidth:             '1060px',
          marginBottom:         '2.5rem',
        }}
      >
        {MODES.map((def, i) => (
          <ModeCard
            key={def.id}
            def={def}
            label={t(def.labelKey)}
            desc={t(def.descKey)}
            isActive={selected === def.id}
            onClick={() => handleSelect(def.id)}
            onLaunch={handleLaunch}
            delay={i * 0.07}
          />
        ))}
      </div>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.45 }}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
      >
        <motion.button
          type="button"
          onClick={handleLaunch}
          whileHover={{ scale: 1.03, boxShadow: `0 8px 32px ${activeDef.glow}` }}
          whileTap={{  scale: 0.97 }}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '0.5rem',
            padding:       '0.75rem 2.5rem',
            borderRadius:  '999px',
            border:        `1px solid ${activeDef.border}`,
            background:    `linear-gradient(135deg, ${activeDef.bg}, rgba(0,0,0,0.2))`,
            color:         activeDef.color,
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.72rem',
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            transition:    'border-color 0.25s, background 0.25s',
            backdropFilter: 'blur(12px)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={selected}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ModeIconSwitch id={selected} color={activeDef.color} />
              Chart Course — {t(activeDef.labelKey)}
            </motion.span>
          </AnimatePresence>

          {/* Arrow */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M14 6l6 6-6 6" stroke={activeDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <p style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.55rem',
          fontStyle:     'italic',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.2)',
          margin:        0,
          userSelect:    'none',
        }}>
          Select a mode · Press Chart Course to begin
        </p>
      </motion.div>

      {/* Bottom fade */}
      <div
        aria-hidden
        style={{
          position:   'absolute',
          bottom:     0,
          left:       0,
          right:      0,
          height:     '120px',
          background: 'linear-gradient(to top, #0C0C0E, transparent)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default SovereignDashboard
