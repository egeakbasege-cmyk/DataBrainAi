'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export type AnalysisMode = 'upwind' | 'downwind' | 'sail'

interface Props {
  mode: AnalysisMode
  onChange: (m: AnalysisMode) => void
}

function UpwindIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sail */}
      <path d="M12 3 L12 19 L4 19 Z" fill={color} opacity="0.9" />
      <path d="M12 3 L12 19 L20 12 Z" fill={color} opacity="0.45" />
      {/* Mast */}
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Hull */}
      <path d="M5 19 Q12 22 19 19" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* Wind arrows pointing up-left */}
      <path d="M2 8 L2 5 L5 5" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"/>
      <path d="M2 5 L5 8" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

function DownwindIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large spinnaker sail */}
      <path d="M12 4 C6 6 3 12 5 19 L12 19 Z" fill={color} opacity="0.9"/>
      <path d="M12 4 C18 6 21 12 19 19 L12 19 Z" fill={color} opacity="0.55"/>
      {/* Mast */}
      <line x1="12" y1="3" x2="12" y2="20" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Hull */}
      <path d="M5 19 Q12 22 19 19" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* Wind arrows pointing down-right */}
      <path d="M19 8 L22 8 L22 11" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"/>
      <path d="M22 8 L19 11" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

function SailAutoIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Billowing mainsail */}
      <path d="M12 3 C18 5 22 11 20 19 L12 19 Z" fill={color} opacity="0.9"/>
      {/* Jib */}
      <path d="M12 8 C16 9 18 14 17 19 L12 19 Z" fill={color} opacity="0.45"/>
      {/* Mast */}
      <line x1="12" y1="2" x2="12" y2="20" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Hull */}
      <path d="M5 19 Q12 22 19 19" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      {/* Auto star */}
      <circle cx="5" cy="6" r="1.5" fill={color} opacity="0.7"/>
      <circle cx="5" cy="6" r="0.6" fill={color}/>
    </svg>
  )
}

const MODES: { id: AnalysisMode; activeColor: string; activeBg: string; activeBorder: string }[] = [
  { id: 'upwind',   activeColor: '#1A5276', activeBg: 'rgba(26,82,118,0.08)',   activeBorder: 'rgba(26,82,118,0.6)'  },
  { id: 'downwind', activeColor: '#00695C', activeBg: 'rgba(0,150,136,0.07)',   activeBorder: 'rgba(0,150,136,0.6)'  },
  { id: 'sail',     activeColor: '#92400E', activeBg: 'rgba(201,169,110,0.10)', activeBorder: 'rgba(201,169,110,0.7)' },
]

function ModeIcon({ id, color }: { id: AnalysisMode; color: string }) {
  if (id === 'upwind')   return <UpwindIcon   color={color} />
  if (id === 'downwind') return <DownwindIcon color={color} />
  return <SailAutoIcon color={color} />
}

export function ModeSelector({ mode, onChange }: Props) {
  const { t } = useLanguage()

  const labelKey: Record<AnalysisMode, 'mode.upwind' | 'mode.downwind' | 'mode.sail'> = {
    upwind:   'mode.upwind',
    downwind: 'mode.downwind',
    sail:     'mode.sail',
  }
  const descKey: Record<AnalysisMode, 'mode.upwindDesc' | 'mode.downwindDesc' | 'mode.sailDesc'> = {
    upwind:   'mode.upwindDesc',
    downwind: 'mode.downwindDesc',
    sail:     'mode.sailDesc',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
      {MODES.map(({ id, activeColor, activeBg, activeBorder }) => {
        const active    = mode === id
        const iconColor = active ? activeColor : '#71717A'
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.98 }}
            style={{
              padding:      '0.875rem 0.75rem',
              border:       `1px solid ${active ? activeBorder : 'rgba(12,12,14,0.1)'}`,
              background:    active ? activeBg : '#FFFFFF',
              cursor:       'pointer',
              textAlign:    'left',
              transition:   'all 0.18s',
              borderRadius: '4px',
              position:     'relative',
            }}
          >
            {id === 'sail' && (
              <span style={{
                position:      'absolute',
                top:           '-7px',
                left:          '50%',
                transform:     'translateX(-50%)',
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.52rem',
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         '#FFFFFF',
                background:    '#C9A96E',
                padding:       '1px 6px',
                borderRadius:  '2px',
                whiteSpace:    'nowrap',
              }}>
                NEW
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <ModeIcon id={id} color={iconColor} />
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.68rem',
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         active ? activeColor : '#0C0C0E',
              }}>
                {t(labelKey[id])}
              </span>
            </div>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.68rem',
              color:      active ? activeColor : '#71717A',
              lineHeight: 1.4,
              margin:     0,
            }}>
              {t(descKey[id])}
            </p>
          </motion.button>
        )
      })}
    </div>
  )
}
