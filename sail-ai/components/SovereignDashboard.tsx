'use client'

/**
 * components/SovereignDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen pre-conversation mode picker.
 *
 * Design philosophy: blend — not replace.
 * The card DNA is exactly the original ModeSelector (dark rgba(14,14,22),
 * mode-coloured border/glow, champagne synergy shimmer, same SVG icons,
 * same badge language).  The improvements layered on top are:
 *   • Staggered spring entrance (cards appear one-by-one on load)
 *   • layoutId spring ring that slides between the active card
 *   • Hover: subtle y-lift + glow intensifies
 *   • Capability bullets inside each card (extra detail, not in ModeSelector)
 *   • Header: same WelcomeBanner-style (dark card, gold hairline, Cormorant)
 *   • "Chart Course" CTA in the same champagne button style
 *
 * Props interface unchanged — chat/page.tsx needs zero edits.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage }             from '@/lib/i18n/LanguageContext'
import type { TranslationKey }     from '@/lib/i18n/translations'

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

// ── Mode palette — identical to ModeSelector ─────────────────────────────────

interface ModeDef {
  id:        SovereignMode
  labelKey:  TranslationKey
  descKey:   TranslationKey
  color:     string
  bg:        string
  border:    string
  glow:      string
  badge?:    string
  caps:      [string, string, string]
}

const MODES: ModeDef[] = [
  {
    id:       'upwind',
    labelKey: 'mode.upwind',
    descKey:  'mode.upwindDesc',
    color:    '#1A5276',
    bg:       'rgba(26,82,118,0.07)',
    border:   'rgba(26,82,118,0.5)',
    glow:     'rgba(26,82,118,0.12)',
    caps:     ['Instant strategic brief', 'Numerically anchored output', 'Live research synthesis'],
  },
  {
    id:       'sail',
    labelKey: 'mode.sail',
    descKey:  'mode.sailDesc',
    color:    '#7C3AED',
    bg:       'rgba(124,58,237,0.07)',
    border:   'rgba(124,58,237,0.5)',
    glow:     'rgba(124,58,237,0.12)',
    badge:    'AI+',
    caps:     ['Intent-aware model routing', '8B + 70B speculative race', 'Adaptive depth calibration'],
  },
  {
    id:       'trim',
    labelKey: 'mode.trim',
    descKey:  'mode.trimDesc',
    color:    '#B45309',
    bg:       'rgba(180,83,9,0.07)',
    border:   'rgba(201,169,110,0.6)',
    glow:     'rgba(201,169,110,0.12)',
    badge:    'NEW',
    caps:     ['Phased execution roadmap', 'Dependency chain mapping', 'KPI milestone structure'],
  },
  {
    id:       'catamaran',
    labelKey: 'mode.catamaran',
    descKey:  'mode.catamaranDesc',
    color:    '#D4AF37',
    bg:       'rgba(212,175,55,0.12)',
    border:   'rgba(212,175,55,0.7)',
    glow:     'rgba(212,175,55,0.18)',
    badge:    'PRO',
    caps:     ['Dual-track growth model', 'Market + CX in parallel', 'Unified strategic keel'],
  },
  // Synergy is rendered separately (special champagne treatment)
]

// ── Icons — same SVG geometry as ModeSelector ────────────────────────────────

function UpwindIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L12 19L4 19Z"  fill={color} opacity="0.85"/>
      <path d="M12 3L12 19L20 12Z" fill={color} opacity="0.35"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function SailIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C18 5 22 11 20 19L12 19Z" fill={color} opacity="0.85"/>
      <path d="M12 8C16 9 18 14 17 19L12 19Z" fill={color} opacity="0.4"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="5" cy="6" r="1.8" fill={color} opacity="0.6"/>
    </svg>
  )
}
function TrimIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="4" x2="6" y2="20" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.35"/>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 18L6 20L8 18"    stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 18L18 20L20 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6"  y1="14" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4L18 10L12 10Z" fill={color} opacity="0.8"/>
      <line x1="2" y1="10" x2="5" y2="10" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="2" y1="13" x2="4" y2="13" stroke={color} strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
function SynergyIcon({ colors }: { colors?: string[] }) {
  const c0 = colors?.[0] ?? '#C9A96E'
  const c1 = colors?.[1] ?? '#7C3AED'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3"    fill={c0} opacity="0.8"/>
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3"  fill={c1} opacity="0.8"/>
      <polygon points="12,11.7 16,14 16,18.7 12,21 8,18.7 8,14" fill={c0} opacity="0.65"/>
      <circle cx="12" cy="10" r="1.8" fill="#FFFFFF" opacity="0.9"/>
    </svg>
  )
}

function ModeIconSwitch({ id, color }: { id: SovereignMode; color: string }) {
  if (id === 'upwind')   return <UpwindIcon    color={color} />
  if (id === 'sail')     return <SailIcon      color={color} />
  if (id === 'trim')     return <TrimIcon      color={color} />
  if (id === 'catamaran') return <CatamaranIcon color={color} />
  return <SynergyIcon />
}

// ── Standard mode card (same DNA as ModeSelector, enlarged + animated) ────────

interface ModeCardProps {
  def:      ModeDef
  label:    string
  desc:     string
  isActive: boolean
  delay:    number
  onClick:  () => void
}

function ModeCard({ def, label, desc, isActive, delay, onClick }: ModeCardProps) {
  const [hov, setHov] = useState(false)

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      onHoverStart={() => setHov(true)}
      onHoverEnd={()  => setHov(false)}
      // Stagger entrance
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: hov ? -3 : 0 }}
      transition={
        hov
          ? { type: 'spring', stiffness: 340, damping: 28 }
          : { duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }
      }
      whileTap={{ scale: 0.97 }}
      style={{
        position:     'relative',
        padding:      '1.1rem 1rem 1rem',
        border:       `1px solid ${isActive ? def.border : hov ? def.border : 'rgba(255,255,255,0.07)'}`,
        background:   isActive ? def.bg : hov ? `${def.bg}` : 'rgba(14,14,22,0.7)',
        cursor:       'pointer',
        textAlign:    'left',
        borderRadius: '10px',
        boxShadow:    isActive
          ? `0 0 0 3px ${def.glow}, 0 2px 12px rgba(0,0,0,0.4), 0 8px 32px ${def.glow}`
          : hov
            ? `0 0 0 1px ${def.glow}, 0 4px 20px rgba(0,0,0,0.3)`
            : '0 1px 4px rgba(0,0,0,0.2)',
        transition:   'border-color 0.18s, background 0.18s, box-shadow 0.18s',
        outline:      'none',
      }}
    >
      {/* Spring-animated active selection ring */}
      {isActive && (
        <motion.span
          layoutId="sov-ring"
          style={{
            position:      'absolute',
            inset:         '-1px',
            borderRadius:  '11px',
            border:        `1.5px solid ${def.border}`,
            pointerEvents: 'none',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        />
      )}

      {/* Badge */}
      {def.badge && (
        <span style={{
          position:      'absolute',
          top:           '-7px',
          right:         '10px',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.5rem',
          fontWeight:    700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         def.badge === 'AI+' ? '#1E293B' : '#FFFFFF',
          background:    def.badge === 'AI+'
            ? (isActive ? '#94A3B8' : 'rgba(148,163,184,0.85)')
            : (isActive ? def.color : '#C9A96E'),
          padding:       '2px 7px',
          borderRadius:  '3px',
          filter:        def.badge === 'AI+' ? 'drop-shadow(0 0 5px rgba(148,163,184,0.55))' : 'none',
        }}>
          {def.badge}
        </span>
      )}

      {/* Icon + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <ModeIconSwitch id={def.id} color={isActive ? def.color : '#9CA3AF'} />
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.7rem',
          fontWeight:    700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color:         isActive ? def.color : hov ? 'rgba(255,255,255,0.7)' : '#A1A1AA',
          transition:    'color 0.18s',
        }}>
          {label}
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.68rem',
        lineHeight: 1.5,
        color:      isActive ? def.color : '#6B6B8A',
        margin:     '0 0 0.75rem',
        opacity:    isActive ? 0.9 : 1,
        transition: 'color 0.18s',
      }}>
        {desc}
      </p>

      {/* Capability bullets — the improvement layer */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
        {def.caps.map(cap => (
          <li key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width:        '3px',
              height:       '3px',
              borderRadius: '50%',
              background:   isActive ? def.color : 'rgba(255,255,255,0.2)',
              flexShrink:   0,
              transition:   'background 0.18s',
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.6rem',
              color:      isActive ? `${def.color}bb` : 'rgba(255,255,255,0.3)',
              lineHeight: 1.4,
              transition: 'color 0.18s',
            }}>
              {cap}
            </span>
          </li>
        ))}
      </ul>
    </motion.button>
  )
}

// ── Synergy card — same special champagne treatment as ModeSelector ────────────

interface SynergyCardProps {
  label:       string
  desc:        string
  isActive:    boolean
  delay:       number
  companyName?: string
  onClick:     () => void
}

function SynergyCard({ label, desc, isActive, delay, companyName, onClick }: SynergyCardProps) {
  const [hov, setHov] = useState(false)
  const synergyColors = ['#C9A96E', '#7C3AED', '#1A5276']

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      onHoverStart={() => setHov(true)}
      onHoverEnd={()  => setHov(false)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: hov ? -3 : 0 }}
      transition={
        hov
          ? { type: 'spring', stiffness: 340, damping: 28 }
          : { duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }
      }
      whileTap={{ scale: 0.985 }}
      style={{
        position:     'relative',
        padding:      isActive ? '1.1rem 1rem 1.1rem' : '1.1rem 1rem 1rem',
        border:       isActive
          ? '1px solid rgba(201,169,110,0.7)'
          : `1px solid rgba(201,169,110,${hov ? 0.4 : 0.22})`,
        background:   isActive
          ? 'linear-gradient(135deg, rgba(14,14,22,0.95) 0%, rgba(20,12,30,0.95) 100%)'
          : `linear-gradient(135deg, rgba(14,14,22,${hov ? 0.9 : 0.8}) 0%, rgba(18,10,28,${hov ? 0.9 : 0.8}) 100%)`,
        cursor:       'pointer',
        textAlign:    'left',
        borderRadius: '10px',
        boxShadow:    isActive
          ? '0 0 0 3px rgba(201,169,110,0.10), 0 0 24px rgba(201,169,110,0.10), 0 2px 12px rgba(0,0,0,0.4)'
          : hov
            ? '0 0 0 1px rgba(201,169,110,0.08), 0 4px 20px rgba(0,0,0,0.3)'
            : '0 1px 4px rgba(0,0,0,0.25)',
        transition:   'all 0.2s ease',
        overflow:     'hidden',
        outline:      'none',
      }}
    >
      {/* Spring ring */}
      {isActive && (
        <motion.span
          layoutId="sov-ring"
          style={{
            position:      'absolute',
            inset:         '-1px',
            borderRadius:  '11px',
            border:        '1.5px solid rgba(201,169,110,0.7)',
            pointerEvents: 'none',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        />
      )}

      {/* Animated shimmer hairline at top — same as ModeSelector */}
      <div style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     '1px',
        background: isActive
          ? `linear-gradient(90deg, transparent, ${synergyColors[0]}, ${synergyColors[1]}, transparent)`
          : `linear-gradient(90deg, transparent, rgba(201,169,110,${hov ? 0.55 : 0.4}), transparent)`,
        transition: 'all 0.3s',
      }} />

      {/* SYN badge */}
      <span style={{
        position:      'absolute',
        top:           '-7px',
        right:         '10px',
        fontFamily:    'Inter, sans-serif',
        fontSize:      '0.5rem',
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         '#0C0C0E',
        background:    isActive
          ? 'linear-gradient(90deg, #C9A96E, #E8C87A)'
          : '#C9A96E',
        padding:       '2px 7px',
        borderRadius:  '3px',
      }}>
        ⊕ SYN
      </span>

      {/* Icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <SynergyIcon colors={isActive ? synergyColors : undefined} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {companyName && (
            <span style={{
              fontFamily:    '"Cormorant Garamond", Georgia, serif',
              fontSize:      '0.72rem',
              fontStyle:     'italic',
              fontWeight:    600,
              letterSpacing: '0.03em',
              background:    isActive
                ? 'linear-gradient(90deg, #C9A96E, #E8C87A, #C9A96E)'
                : 'linear-gradient(90deg, rgba(201,169,110,0.7), rgba(201,169,110,0.5))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip:       'text',
            }}>
              {companyName}
            </span>
          )}
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.7rem',
            fontWeight:    700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color:         isActive ? '#C9A96E' : hov ? 'rgba(201,169,110,0.7)' : '#A1A1AA',
            transition:    'color 0.2s',
          }}>
            {companyName ? `· ${label}` : label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.68rem',
        lineHeight: 1.5,
        color:      isActive ? 'rgba(201,169,110,0.8)' : '#6B6B8A',
        margin:     '0 0 0.75rem',
        transition: 'color 0.2s',
      }}>
        {desc}
      </p>

      {/* Capabilities */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
        {(['3 specialist agents in parallel', 'Financial · Strategic · Operational lenses', '70B synthesis — one authoritative verdict'] as const).map(cap => (
          <li key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width: '3px', height: '3px', borderRadius: '50%',
              background:   isActive ? '#C9A96E' : 'rgba(201,169,110,0.25)',
              flexShrink:   0,
              transition:   'background 0.18s',
            }} />
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.6rem',
              color:      isActive ? 'rgba(201,169,110,0.65)' : 'rgba(255,255,255,0.25)',
              lineHeight: 1.4,
              transition: 'color 0.18s',
            }}>
              {cap}
            </span>
          </li>
        ))}
      </ul>
    </motion.button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SovereignDashboard({
  initialMode    = 'upwind',
  onModeSelect,
  companyName,
  className = '',
}: SovereignDashboardProps) {
  const { t }                   = useLanguage()
  const [selected, setSelected] = useState<SovereignMode>(initialMode)

  const select  = useCallback((m: SovereignMode) => setSelected(m), [])
  const launch  = useCallback(() => onModeSelect(selected), [onModeSelect, selected])

  const activeDef = selected !== 'synergy'
    ? MODES.find(m => m.id === selected)!
    : null

  // Order: upwind, sail | trim, catamaran | synergy (spans both columns)
  const cardOrder: SovereignMode[] = ['upwind', 'sail', 'trim', 'catamaran']

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
        padding:        '2.5rem 1.5rem 3rem',
      }}
    >
      {/* Subtle teal grid overlay — same as chat page aesthetic */}
      <div
        aria-hidden
        style={{
          position:        'absolute',
          inset:           0,
          backgroundImage: [
            'linear-gradient(rgba(45,212,191,0.035) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(45,212,191,0.035) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize:  '60px 60px',
          pointerEvents:   'none',
        }}
      />

      {/* Ambient glow — shifts colour with selected mode */}
      <motion.div
        key={selected}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        style={{
          position:     'absolute',
          top:          '-8%',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '640px',
          height:       '420px',
          borderRadius: '50%',
          background:   selected === 'synergy'
            ? 'radial-gradient(ellipse, rgba(201,169,110,0.12) 0%, transparent 65%)'
            : `radial-gradient(ellipse, ${activeDef?.glow ?? 'rgba(26,82,118,0.12)'} 0%, transparent 65%)`,
          filter:       'blur(48px)',
          pointerEvents:'none',
        }}
      />

      {/* ── Header — same WelcomeBanner dark-card DNA ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0   }}
        transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:     'relative',
          width:        '100%',
          maxWidth:     '640px',
          background:   'linear-gradient(135deg, #0C0C0E 0%, #131320 100%)',
          border:       '1px solid rgba(201,169,110,0.18)',
          borderRadius: '14px',
          padding:      '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          overflow:     'hidden',
        }}
      >
        {/* Gold hairline at top — same as WelcomeBanner */}
        <div style={{
          position:   'absolute',
          top: 0, left: '8%', right: '8%',
          height:     '1px',
          background: 'linear-gradient(90deg, transparent, #C9A96E 40%, #14B8A6 60%, transparent)',
          opacity:    0.55,
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            {companyName && (
              <span style={{
                display:       'block',
                fontFamily:    '"Cormorant Garamond", Georgia, serif',
                fontStyle:     'italic',
                fontSize:      '0.72rem',
                fontWeight:    600,
                color:         '#C9A96E',
                letterSpacing: '0.04em',
                marginBottom:  '0.2rem',
                opacity:       0.85,
              }}>
                {companyName}
              </span>
            )}
            <h1 style={{
              fontFamily:    '"Cormorant Garamond", Georgia, serif',
              fontSize:      'clamp(1.4rem, 2.8vw, 2rem)',
              fontWeight:    600,
              color:         '#FFFFFF',
              margin:        0,
              lineHeight:    1.15,
              letterSpacing: '-0.01em',
            }}>
              Set Your Course
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.68rem',
              color:      'rgba(255,255,255,0.38)',
              margin:     '0.35rem 0 0',
              lineHeight: 1.5,
            }}>
              Choose an intelligence architecture for this session.
            </p>
          </div>

          {/* Selected mode indicator — animated */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1   }}
              exit={{    opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '0.2rem',
                flexShrink:    0,
              }}
            >
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.48rem',
                fontWeight:    700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         'rgba(255,255,255,0.3)',
              }}>
                Active
              </span>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.62rem',
                fontWeight:    700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color:         selected === 'synergy' ? '#C9A96E' : (activeDef?.color ?? '#FFFFFF'),
              }}>
                {t(`mode.${selected}` as TranslationKey)}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Mode card grid ─────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label="Analysis modes"
        style={{
          position:            'relative',
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '0.55rem',
          width:               '100%',
          maxWidth:            '640px',
          marginBottom:        '0.55rem',
        }}
      >
        {cardOrder.map((id, i) => {
          const def = MODES.find(m => m.id === id)!
          return (
            <ModeCard
              key={id}
              def={def}
              label={t(def.labelKey)}
              desc={t(def.descKey)}
              isActive={selected === id}
              delay={0.06 + i * 0.07}
              onClick={() => select(id)}
            />
          )
        })}
      </div>

      {/* Synergy — full-width row */}
      <div style={{ width: '100%', maxWidth: '640px', marginBottom: '1.25rem' }}>
        <SynergyCard
          label={t('mode.synergy')}
          desc={t('mode.synergyDesc')}
          isActive={selected === 'synergy'}
          delay={0.34}
          companyName={companyName}
          onClick={() => select('synergy')}
        />
      </div>

      {/* ── Chart Course CTA ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.44, duration: 0.4 }}
        style={{ width: '100%', maxWidth: '640px' }}
      >
        <motion.button
          type="button"
          onClick={launch}
          whileHover={{
            scale:     1.015,
            boxShadow: selected === 'synergy'
              ? '0 8px 32px rgba(201,169,110,0.2)'
              : `0 8px 32px ${activeDef?.glow ?? 'rgba(26,82,118,0.2)'}`,
          }}
          whileTap={{ scale: 0.975 }}
          style={{
            width:         '100%',
            padding:       '0.85rem 1.5rem',
            borderRadius:  '10px',
            border:        selected === 'synergy'
              ? '1px solid rgba(201,169,110,0.45)'
              : `1px solid ${activeDef?.border ?? 'rgba(255,255,255,0.1)'}`,
            background:    selected === 'synergy'
              ? 'linear-gradient(135deg, rgba(201,169,110,0.12) 0%, rgba(14,14,22,0.8) 100%)'
              : `linear-gradient(135deg, ${activeDef?.bg ?? 'rgba(26,82,118,0.07)'}, rgba(14,14,22,0.8))`,
            cursor:        'pointer',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            gap:           '0.65rem',
          }}
        >
          {/* Animated icon + label on mode change */}
          <AnimatePresence mode="wait">
            <motion.span
              key={selected}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0  }}
              exit={{    opacity: 0, x:  6  }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ModeIconSwitch
                id={selected}
                color={selected === 'synergy' ? '#C9A96E' : (activeDef?.color ?? '#FFFFFF')}
              />
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.72rem',
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         selected === 'synergy' ? '#C9A96E' : (activeDef?.color ?? '#FFFFFF'),
              }}>
                Chart Course
              </span>
            </motion.span>
          </AnimatePresence>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M14 6l6 6-6 6"
              stroke={selected === 'synergy' ? '#C9A96E' : (activeDef?.color ?? '#FFFFFF')}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <p style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.54rem',
          fontStyle:     'italic',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.18)',
          textAlign:     'center',
          margin:        '0.65rem 0 0',
          userSelect:    'none',
        }}
        aria-hidden>
          Select a mode · Chart Course to begin
        </p>
      </motion.div>

      {/* Bottom vignette */}
      <div
        aria-hidden
        style={{
          position:     'absolute',
          bottom: 0, left: 0, right: 0,
          height:       '80px',
          background:   'linear-gradient(to top, #0C0C0E, transparent)',
          pointerEvents:'none',
        }}
      />
    </div>
  )
}

export default SovereignDashboard
