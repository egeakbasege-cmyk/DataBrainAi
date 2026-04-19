'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { TranslationKey } from '@/lib/i18n/translations'

export type AnalysisMode = 'upwind' | 'downwind' | 'sail' | 'trim'

interface Props {
  mode: AnalysisMode
  onChange: (m: AnalysisMode) => void
}

const MODES: {
  id: AnalysisMode
  color: string
  bg: string
  border: string
  glow: string
  badge?: string
}[] = [
  { id: 'upwind',   color: '#1A5276', bg: 'rgba(26,82,118,0.07)',   border: 'rgba(26,82,118,0.5)',   glow: 'rgba(26,82,118,0.12)'  },
  { id: 'downwind', color: '#00695C', bg: 'rgba(0,105,92,0.07)',    border: 'rgba(0,105,92,0.5)',    glow: 'rgba(0,105,92,0.12)'   },
  { id: 'sail',     color: '#7C3AED', bg: 'rgba(124,58,237,0.07)',  border: 'rgba(124,58,237,0.5)',  glow: 'rgba(124,58,237,0.12)', badge: 'AI' },
  { id: 'trim',     color: '#B45309', bg: 'rgba(180,83,9,0.07)',    border: 'rgba(201,169,110,0.6)', glow: 'rgba(201,169,110,0.12)', badge: 'NEW' },
]

const LABEL_KEYS: Record<AnalysisMode, TranslationKey> = {
  upwind:   'mode.upwind',
  downwind: 'mode.downwind',
  sail:     'mode.sail',
  trim:     'mode.trim',
}
const DESC_KEYS: Record<AnalysisMode, TranslationKey> = {
  upwind:   'mode.upwindDesc',
  downwind: 'mode.downwindDesc',
  sail:     'mode.sailDesc',
  trim:     'mode.trimDesc',
}

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

function ModeIcon({ id, color }: { id: AnalysisMode; color: string }) {
  if (id === 'upwind')   return <UpwindIcon   color={color} />
  if (id === 'downwind') return <DownwindIcon color={color} />
  if (id === 'sail')     return <SailIcon     color={color} />
  return <TrimIcon color={color} />
}

export function ModeSelector({ mode, onChange }: Props) {
  const { t } = useLanguage()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%' }}>
      {MODES.map(({ id, color, bg, border, glow, badge }) => {
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
              border:       `1px solid ${active ? border : 'rgba(0,0,0,0.08)'}`,
              background:   active ? bg : '#FFFFFF',
              cursor:       'pointer',
              textAlign:    'left',
              borderRadius: '10px',
              boxShadow:    active ? `0 0 0 3px ${glow}, 0 2px 8px rgba(0,0,0,0.05)` : '0 1px 4px rgba(0,0,0,0.04)',
              transition:   'all 0.18s ease',
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
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         '#FFFFFF',
                background:    active ? color : '#C9A96E',
                padding:       '2px 7px',
                borderRadius:  '3px',
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
                color:         active ? color : '#374151',
              }}>
                {t(LABEL_KEYS[id])}
              </span>
            </div>

            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.68rem',
              lineHeight: 1.45,
              color:      active ? color : '#9CA3AF',
              margin:     0,
              opacity:    active ? 0.9 : 1,
            }}>
              {t(DESC_KEYS[id])}
            </p>
          </motion.button>
        )
      })}
    </div>
  )
}
