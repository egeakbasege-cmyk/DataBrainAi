'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { TranslationKey } from '@/lib/i18n/translations'

export type AnalysisMode = 'upwind' | 'downwind' | 'sail' | 'trim' | 'catamaran' | 'operator' | 'synergy'

interface Props {
  mode: AnalysisMode
  onChange: (m: AnalysisMode) => void
  synergyModes?: AnalysisMode[]
  onSynergyChange?: (modes: AnalysisMode[]) => void
  brandName?: string
}

// ── Base mode palette (6 core modes) ──────────────────────────────────────────
const MODES: {
  id: AnalysisMode
  color: string
  bg: string
  border: string
  glow: string
  badge?: string
  fullWidth?: boolean
}[] = [
  { id: 'upwind',    color: '#1A5276', bg: 'rgba(26,82,118,0.07)',   border: 'rgba(26,82,118,0.5)',   glow: 'rgba(26,82,118,0.12)'  },
  { id: 'downwind',  color: '#00695C', bg: 'rgba(0,105,92,0.07)',    border: 'rgba(0,105,92,0.5)',    glow: 'rgba(0,105,92,0.12)'   },
  { id: 'sail',      color: '#7C3AED', bg: 'rgba(124,58,237,0.07)',  border: 'rgba(124,58,237,0.5)',  glow: 'rgba(124,58,237,0.12)', badge: 'AI+' },
  { id: 'trim',      color: '#B45309', bg: 'rgba(180,83,9,0.07)',    border: 'rgba(201,169,110,0.6)', glow: 'rgba(201,169,110,0.12)', badge: 'NEW' },
  { id: 'catamaran', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.7)',  glow: 'rgba(212,175,55,0.18)', badge: 'PRO' },
  { id: 'operator',  color: '#CC2200', bg: 'rgba(204,34,0,0.07)',    border: 'rgba(204,34,0,0.55)',   glow: 'rgba(204,34,0,0.12)',   badge: 'OPR', fullWidth: true },
]

// Colour looked up by mode id for synergy chip rendering
const MODE_COLOR: Record<string, string> = {
  upwind: '#1A5276', downwind: '#00695C', sail: '#7C3AED',
  trim: '#B45309', catamaran: '#D4AF37', operator: '#CC2200',
}

const LABEL_KEYS: Record<AnalysisMode, TranslationKey> = {
  upwind:    'mode.upwind',
  downwind:  'mode.downwind',
  sail:      'mode.sail',
  trim:      'mode.trim',
  catamaran: 'mode.catamaran',
  operator:  'mode.operator',
  synergy:   'mode.synergy',
}
const DESC_KEYS: Record<AnalysisMode, TranslationKey> = {
  upwind:    'mode.upwindDesc',
  downwind:  'mode.downwindDesc',
  sail:      'mode.sailDesc',
  trim:      'mode.trimDesc',
  catamaran: 'mode.catamaranDesc',
  operator:  'mode.operatorDesc',
  synergy:   'mode.synergyDesc',
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function UpwindIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L12 19L4 19Z" fill={color} opacity="0.85"/>
      <path d="M12 3L12 19L20 12Z" fill={color} opacity="0.35"/>
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 19Q12 22 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function DownwindIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 4C6 6 3 12 5 19L12 19Z" fill={color} opacity="0.85"/>
      <path d="M12 4C18 6 21 12 19 19L12 19Z" fill={color} opacity="0.4"/>
      <line x1="12" y1="3" x2="12" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
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
      <rect x="11" y="5"  width="9"  height="2" rx="1" fill={color} opacity="0.85"/>
      <rect x="11" y="11" width="7"  height="2" rx="1" fill={color} opacity="0.65"/>
      <rect x="11" y="17" width="5"  height="2" rx="1" fill={color} opacity="0.45"/>
    </svg>
  )
}
function CatamaranIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 18L6 20L8 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 18L18 20L20 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="6" y1="14" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 4L18 10L12 10Z" fill={color} opacity="0.8"/>
      <line x1="2" y1="10" x2="5" y2="10" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="2" y1="13" x2="4" y2="13" stroke={color} strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}
function OperatorIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.3" opacity="0.45"/>
      <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.5" opacity="0.8"/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
      <line x1="12" y1="2"  x2="12" y2="7"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2"  y1="12" x2="7"  y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
/** War room icon — interlocking hexagons */
function SynergyIcon({ colors }: { colors: string[] }) {
  const c0 = colors[0] ?? '#C9A96E'
  const c1 = colors[1] ?? '#7C3AED'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {/* Left hex */}
      <polygon points="7,3 11,5.3 11,10 7,12.3 3,10 3,5.3" fill={c0} opacity="0.8"/>
      {/* Right hex */}
      <polygon points="17,3 21,5.3 21,10 17,12.3 13,10 13,5.3" fill={c1} opacity="0.8"/>
      {/* Bottom center hex */}
      <polygon points="12,11.7 16,14 16,18.7 12,21 8,18.7 8,14" fill={colors[2] ?? c0} opacity="0.65"/>
      {/* Centre dot */}
      <circle cx="12" cy="10" r="1.8" fill="#FFFFFF" opacity="0.9"/>
    </svg>
  )
}

function ModeIcon({ id, color, synergyColors }: { id: AnalysisMode; color: string; synergyColors?: string[] }) {
  if (id === 'upwind')    return <UpwindIcon    color={color} />
  if (id === 'downwind')  return <DownwindIcon  color={color} />
  if (id === 'sail')      return <SailIcon      color={color} />
  if (id === 'catamaran') return <CatamaranIcon color={color} />
  if (id === 'operator')  return <OperatorIcon  color={color} />
  if (id === 'synergy')   return <SynergyIcon   colors={synergyColors ?? ['#C9A96E', '#7C3AED']} />
  return <TrimIcon color={color} />
}

// ── Synergy sub-selector (inline, shown when synergy is active) ───────────────
const SYNERGY_BASES: AnalysisMode[] = ['upwind', 'downwind', 'sail', 'trim', 'catamaran', 'operator']

function SynergySubSelector({
  selected,
  onChange,
}: {
  selected: AnalysisMode[]
  onChange: (modes: AnalysisMode[]) => void
}) {
  function toggle(id: AnalysisMode) {
    if (selected.includes(id)) {
      if (selected.length <= 2) return // enforce min 2
      onChange(selected.filter(m => m !== id))
    } else {
      if (selected.length >= 4) return // enforce max 4
      onChange([...selected, id])
    }
  }

  const tooFew = selected.length < 2

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(201,169,110,0.2)',
      }}>
        {/* Instruction */}
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.6rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tooFew ? '#CC2200' : 'rgba(201,169,110,0.6)',
          margin: '0 0 0.5rem',
          transition: 'color 0.2s',
        }}>
          {tooFew ? '⚠ Select at least 2 modes' : `${selected.length} / 4 modes active — Council assembled`}
        </p>

        {/* 3×2 mini mode grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
          {SYNERGY_BASES.map(id => {
            const col   = MODE_COLOR[id]
            const on    = selected.includes(id)
            const maxed = selected.length >= 4 && !on
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                disabled={maxed}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '0.3rem',
                  padding:        '0.3rem 0.5rem',
                  border:         `1px solid ${on ? col : 'rgba(255,255,255,0.1)'}`,
                  borderRadius:   '6px',
                  background:     on ? `${col}22` : 'rgba(255,255,255,0.03)',
                  cursor:         maxed ? 'not-allowed' : 'pointer',
                  opacity:        maxed ? 0.35 : 1,
                  transition:     'all 0.15s',
                }}
              >
                {/* Checkmark / empty circle */}
                <span style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${on ? col : 'rgba(255,255,255,0.25)'}`,
                  background: on ? col : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {on && (
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                      <polyline points="1.5,5 4,7.5 8.5,2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: on ? col : 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                }}>
                  {id === 'upwind' ? 'Upwind' : id === 'downwind' ? 'Dwnwnd' : id.charAt(0).toUpperCase() + id.slice(1)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active mode colour chips */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {selected.map(id => (
              <span key={id} style={{
                padding: '2px 8px',
                borderRadius: '999px',
                background: `${MODE_COLOR[id]}33`,
                border: `1px solid ${MODE_COLOR[id]}66`,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.55rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: MODE_COLOR[id],
              }}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </span>
            ))}
            <span style={{
              padding: '2px 8px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.55rem',
              color: 'rgba(201,169,110,0.5)',
              letterSpacing: '0.05em',
            }}>
              → Hybrid engine ready
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main ModeSelector component ───────────────────────────────────────────────

export function ModeSelector({ mode, onChange, synergyModes = [], onSynergyChange, brandName }: Props) {
  const { t } = useLanguage()

  // Derive synergy card colours from selected sub-modes
  const synergyColors = synergyModes.slice(0, 3).map(m => MODE_COLOR[m] ?? '#C9A96E')
  if (synergyColors.length === 0) synergyColors.push('#C9A96E', '#7C3AED')

  const synActive = mode === 'synergy'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%' }}>

      {/* ── 6 core mode cards ── */}
      {MODES.map(({ id, color, bg, border, glow, badge, fullWidth }) => {
        const active = mode === id
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.97 }}
            style={{
              position:     'relative',
              padding:      '0.875rem 0.875rem 0.75rem',
              border:       `1px solid ${active ? border : 'rgba(255,255,255,0.07)'}`,
              background:   active ? bg : 'rgba(14,14,22,0.7)',
              cursor:       'pointer',
              textAlign:    'left',
              borderRadius: '10px',
              boxShadow:    active ? `0 0 0 3px ${glow}, 0 2px 8px rgba(0,0,0,0.3)` : '0 1px 4px rgba(0,0,0,0.2)',
              transition:   'all 0.18s ease',
              gridColumn:   fullWidth ? '1 / -1' : undefined,
            }}
          >
            {badge && (
              <span style={{
                position:      'absolute',
                top:           '-7px',
                right:         '10px',
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.5rem',
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         badge === 'AI+' ? '#1E293B' : '#FFFFFF',
                background:    badge === 'AI+'
                  ? (active ? '#94A3B8' : 'rgba(148,163,184,0.85)')
                  : (active ? color : '#C9A96E'),
                padding:       '2px 7px',
                borderRadius:  '3px',
                filter:        badge === 'AI+' ? 'drop-shadow(0 0 5px rgba(148,163,184,0.55))' : 'none',
              }}>
                {badge}
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <ModeIcon id={id} color={active ? color : '#9CA3AF'} />
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.68rem',
                fontWeight:    700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color:         active ? color : '#A1A1AA',
              }}>
                {t(LABEL_KEYS[id])}
              </span>
            </div>

            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.68rem',
              lineHeight: 1.45,
              color:      active ? color : '#6B6B8A',
              margin:     0,
              opacity:    active ? 0.9 : 1,
            }}>
              {t(DESC_KEYS[id])}
            </p>
          </motion.button>
        )
      })}

      {/* ── 7th card: CUSTOM SYNERGY ── */}
      <motion.button
        type="button"
        onClick={() => onChange('synergy')}
        whileTap={{ scale: 0.985 }}
        style={{
          position:     'relative',
          padding:      synActive ? '0.875rem 0.875rem 1rem' : '0.875rem 0.875rem 0.75rem',
          border:       synActive
            ? '1px solid rgba(201,169,110,0.7)'
            : '1px solid rgba(201,169,110,0.22)',
          background:   synActive
            ? 'linear-gradient(135deg, rgba(14,14,22,0.95) 0%, rgba(20,12,30,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(14,14,22,0.8) 0%, rgba(18,10,28,0.8) 100%)',
          cursor:       'pointer',
          textAlign:    'left',
          borderRadius: '10px',
          boxShadow:    synActive
            ? '0 0 0 3px rgba(201,169,110,0.1), 0 0 20px rgba(201,169,110,0.08), 0 2px 12px rgba(0,0,0,0.4)'
            : '0 1px 4px rgba(0,0,0,0.25)',
          transition:   'all 0.2s ease',
          gridColumn:   '1 / -1',
          overflow:     'hidden',
        }}
      >
        {/* Animated shimmer line at top */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '1px',
          background: synActive
            ? `linear-gradient(90deg, transparent, ${synergyColors[0]}, ${synergyColors[1] ?? '#C9A96E'}, transparent)`
            : 'linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)',
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
          background:    synActive
            ? 'linear-gradient(90deg, #C9A96E, #E8C87A)'
            : '#C9A96E',
          padding:       '2px 7px',
          borderRadius:  '3px',
        }}>
          ⊕ SYN
        </span>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <ModeIcon id="synergy" color={synActive ? '#C9A96E' : '#9CA3AF'} synergyColors={synActive ? synergyColors : undefined} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {/* Company name or default */}
            {brandName ? (
              <span style={{
                fontFamily:    '"Cormorant Garamond", "Cormorant", Georgia, serif',
                fontSize:      '0.72rem',
                fontStyle:     'italic',
                fontWeight:    600,
                letterSpacing: '0.03em',
                background:    synActive
                  ? 'linear-gradient(90deg, #C9A96E, #E8C87A, #C9A96E)'
                  : 'linear-gradient(90deg, rgba(201,169,110,0.7), rgba(201,169,110,0.5))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {brandName}
              </span>
            ) : null}
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.68rem',
              fontWeight:    700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color:         synActive ? '#C9A96E' : '#A1A1AA',
            }}>
              {brandName ? '· CUSTOM SYNERGY' : 'CUSTOM SYNERGY'}
            </span>
          </div>
        </div>

        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '0.68rem',
          lineHeight: 1.45,
          color:      synActive ? 'rgba(201,169,110,0.8)' : '#6B6B8A',
          margin:     0,
        }}>
          {synActive && synergyModes.length >= 2
            ? `${synergyModes.length}-mode war room active — hybrid intelligence engaged`
            : t('mode.synergyDesc')}
        </p>

        {/* Inline sub-selector — only when synergy is active */}
        <AnimatePresence>
          {synActive && (
            <SynergySubSelector
              selected={synergyModes}
              onChange={onSynergyChange ?? (() => undefined)}
            />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
