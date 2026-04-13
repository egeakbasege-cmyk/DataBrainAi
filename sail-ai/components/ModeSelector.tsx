'use client'

import { motion } from 'framer-motion'

export type AnalysisMode = 'upwind' | 'downwind'

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

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      {(['upwind', 'downwind'] as AnalysisMode[]).map((m) => {
        const active = mode === m
        const isUp   = m === 'upwind'
        const activeColor = isUp ? '#1A5276' : '#00695C'
        const iconColor   = active ? activeColor : '#71717A'
        return (
          <motion.button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            whileTap={{ scale: 0.98 }}
            style={{
              padding:    '1rem',
              border:     `1px solid ${active ? (isUp ? 'rgba(26,82,118,0.6)' : 'rgba(0,150,136,0.6)') : 'rgba(12,12,14,0.1)'}`,
              background:  active ? (isUp ? 'rgba(26,82,118,0.08)' : 'rgba(0,150,136,0.07)') : '#FFFFFF',
              cursor:     'pointer',
              textAlign:  'left',
              transition: 'all 0.18s',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              {isUp ? <UpwindIcon color={iconColor} /> : <DownwindIcon color={iconColor} />}
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.72rem',
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         active ? activeColor : '#0C0C0E',
              }}>
                {isUp ? 'Upwind' : 'Downwind'}
              </span>
            </div>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.72rem',
              color:      active ? activeColor : '#71717A',
              lineHeight: 1.4,
              margin:     0,
            }}>
              {isUp ? 'Give data → get instant precise strategy' : 'Free conversation — ask anything, get real answers'}
            </p>
          </motion.button>
        )
      })}
    </div>
  )
}
