'use client'

/**
 * components/InChatModeSwitcher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact in-chat mode selection control — lives in the input toolbar
 * adjacent to the Send button. Provides seamless mid-conversation mode
 * switching without leaving the chat workspace.
 *
 * UX spec:
 *   • Displays as a minimal pill showing the current mode icon + label
 *   • Click → vertical dropdown anchored above the button
 *   • Selecting a mode closes the dropdown and fires onChange
 *   • Backdrop click closes the dropdown
 *   • Keyboard: Escape closes, arrow keys navigate
 *
 * Design: Neo-Precisionist — dark surface, gold accent, tight typography
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence }                  from 'framer-motion'
import { useLanguage }                              from '@/lib/i18n/LanguageContext'
import type { AnalysisMode }                        from '@/components/ModeSelector'
import type { TranslationKey }                      from '@/lib/i18n/translations'

// ── Mode definitions ──────────────────────────────────────────────────────────

interface ModeDef {
  id:      AnalysisMode
  color:   string
  badge?:  string
  icon:    React.ReactNode
}

function UpwindSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L12 19L4 19Z" fill={c} opacity="0.85"/>
      <path d="M12 3L12 19L20 12Z" fill={c} opacity="0.35"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function DownwindSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 4C6 6 3 12 5 19L12 19Z" fill={c} opacity="0.85"/>
      <path d="M12 4C18 6 21 12 19 19L12 19Z" fill={c} opacity="0.4"/>
      <line x1="12" y1="3" x2="12" y2="20" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function SailSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C18 5 22 11 20 19L12 19Z" fill={c} opacity="0.85"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="5" cy="6" r="1.5" fill={c} opacity="0.6"/>
    </svg>
  )
}
function TrimSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6"  r="2" fill={c} opacity="0.9"/>
      <circle cx="6" cy="12" r="2" fill={c} opacity="0.65"/>
      <circle cx="6" cy="18" r="2" fill={c} opacity="0.4"/>
      <rect x="11" y="5"  width="8" height="2" rx="1" fill={c} opacity="0.85"/>
      <rect x="11" y="11" width="6" height="2" rx="1" fill={c} opacity="0.65"/>
      <rect x="11" y="17" width="4" height="2" rx="1" fill={c} opacity="0.45"/>
    </svg>
  )
}
function CatamaranSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="14" x2="18" y2="14" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4L18 10L12 10Z" fill={c} opacity="0.8"/>
    </svg>
  )
}
function OperatorSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.3" opacity="0.45"/>
      <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="1.5" opacity="0.8"/>
      <circle cx="12" cy="12" r="1.5" fill={c}/>
    </svg>
  )
}
function SynergySVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3" fill={c} opacity="0.8"/>
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3" fill={c} opacity="0.8"/>
      <circle cx="12" cy="10" r="1.5" fill="#FFF" opacity="0.9"/>
    </svg>
  )
}
function ScenarioSVG({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M3 17L9 11L13 15L21 7" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
      <circle cx="21" cy="7" r="2" fill={c} opacity="0.7"/>
    </svg>
  )
}

const MODES_DEF: ModeDef[] = [
  { id: 'upwind',    color: '#1A5276', icon: <UpwindSVG    c="#1A5276" /> },
  { id: 'downwind',  color: '#00695C', icon: <DownwindSVG  c="#00695C" /> },
  { id: 'sail',      color: '#7C3AED', icon: <SailSVG      c="#7C3AED" />, badge: 'AI+' },
  { id: 'trim',      color: '#B45309', icon: <TrimSVG      c="#B45309" />, badge: 'NEW' },
  { id: 'catamaran', color: '#D4AF37', icon: <CatamaranSVG c="#D4AF37" />, badge: 'PRO' },
  { id: 'synergy',   color: '#C9A96E', icon: <SynergySVG   c="#C9A96E" />, badge: 'SYN' },
  { id: 'operator',  color: '#CC2200', icon: <OperatorSVG  c="#CC2200" />, badge: 'OPR' },
  { id: 'scenario',  color: '#00C9B1', icon: <ScenarioSVG  c="#00C9B1" /> },
]

const LABEL_KEYS: Record<AnalysisMode, TranslationKey> = {
  upwind:    'mode.upwind',
  downwind:  'mode.downwind',
  sail:      'mode.sail',
  trim:      'mode.trim',
  catamaran: 'mode.catamaran',
  operator:  'mode.operator',
  synergy:   'mode.synergy',
  scenario:  'mode.scenario',
}
const DESC_KEYS: Record<AnalysisMode, TranslationKey> = {
  upwind:    'mode.upwindDesc',
  downwind:  'mode.downwindDesc',
  sail:      'mode.sailDesc',
  trim:      'mode.trimDesc',
  catamaran: 'mode.catamaranDesc',
  operator:  'mode.operatorDesc',
  synergy:   'mode.synergyDesc',
  scenario:  'mode.scenarioDesc',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface InChatModeSwitcherProps {
  mode:     AnalysisMode
  onChange: (m: AnalysisMode) => void
  disabled?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InChatModeSwitcher({ mode, onChange, disabled }: InChatModeSwitcherProps) {
  const { t }                  = useLanguage()
  const [open, setOpen]        = useState(false)
  const [focused, setFocused]  = useState(0)
  const containerRef           = useRef<HTMLDivElement>(null)
  const btnRef                 = useRef<HTMLButtonElement>(null)

  const current = MODES_DEF.find(m => m.id === mode) ?? MODES_DEF[0]!

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'Escape')      { setOpen(false); btnRef.current?.focus() }
    if (e.key === 'ArrowDown')   { e.preventDefault(); setFocused(f => Math.min(f + 1, MODES_DEF.length - 1)) }
    if (e.key === 'ArrowUp')     { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    if (e.key === 'Enter')       { onChange(MODES_DEF[focused]!.id); setOpen(false) }
  }, [open, focused, onChange])

  function select(id: AnalysisMode) {
    onChange(id)
    setOpen(false)
    btnRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', flexShrink: 0 }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger pill */}
      <button
        ref={btnRef}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current mode: ${t(LABEL_KEYS[mode])}. Click to change.`}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '0.4rem',
          padding:        '0.35rem 0.625rem 0.35rem 0.5rem',
          background:     open ? `${current.color}18` : 'rgba(0,0,0,0.05)',
          border:         `1.5px solid ${open ? current.color + '55' : 'rgba(0,0,0,0.09)'}`,
          borderRadius:   '8px',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          transition:     'all 0.15s',
          opacity:        disabled ? 0.4 : 1,
          position:       'relative',
        }}
      >
        {current.icon}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.62rem',
          fontWeight:    700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         open ? current.color : '#374151',
          whiteSpace:    'nowrap',
        }}>
          {t(LABEL_KEYS[mode])}
        </span>
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none"
          stroke={open ? current.color : '#9CA3AF'}
          strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            role="listbox"
            aria-label="Analysis mode"
            style={{
              position:     'absolute',
              bottom:       'calc(100% + 0.5rem)',
              left:         0,
              zIndex:       200,
              background:   'linear-gradient(160deg, #0F0F14 0%, #16121F 100%)',
              border:       '1px solid rgba(255,255,255,0.09)',
              borderRadius: '12px',
              boxShadow:    '0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,169,110,0.08)',
              padding:      '0.375rem',
              width:        '240px',
              overflow:     'hidden',
            }}
          >
            {/* Gold top accent line */}
            <div style={{
              position:   'absolute',
              top:        0,
              left:       '20%',
              right:      '20%',
              height:     '1px',
              background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.6), transparent)',
            }} />

            {MODES_DEF.map((m, i) => {
              const isActive  = m.id === mode
              const isFocused = i === focused

              return (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => select(m.id)}
                  onMouseEnter={() => setFocused(i)}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           '0.6rem',
                    width:         '100%',
                    padding:       '0.5rem 0.625rem',
                    background:    isActive
                      ? `${m.color}20`
                      : isFocused ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border:        `1px solid ${isActive ? m.color + '44' : 'transparent'}`,
                    borderRadius:  '8px',
                    cursor:        'pointer',
                    textAlign:     'left',
                    transition:    'all 0.12s',
                    marginBottom:  i < MODES_DEF.length - 1 ? '0.15rem' : 0,
                  }}
                >
                  {/* Icon */}
                  <span style={{ flexShrink: 0 }}>{m.icon}</span>

                  {/* Label + desc */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{
                        fontFamily:    'Inter, sans-serif',
                        fontSize:      '0.68rem',
                        fontWeight:    700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color:         isActive ? m.color : '#E4E4E7',
                        whiteSpace:    'nowrap',
                      }}>
                        {t(LABEL_KEYS[m.id])}
                      </span>
                      {m.badge && (
                        <span style={{
                          fontFamily:    'Inter, sans-serif',
                          fontSize:      '0.44rem',
                          fontWeight:    700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          background:    m.badge === 'AI+' ? 'rgba(148,163,184,0.85)' : m.color,
                          color:         m.badge === 'AI+' ? '#1E293B' : '#FFF',
                          padding:       '1px 5px',
                          borderRadius:  '3px',
                          lineHeight:    1,
                        }}>
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '0.6rem',
                      lineHeight: 1.4,
                      color:      isActive ? m.color : '#6B6B8A',
                      margin:     '1px 0 0',
                      overflow:   'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {t(DESC_KEYS[m.id])}
                    </p>
                  </div>

                  {/* Active check */}
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
