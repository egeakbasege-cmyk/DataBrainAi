'use client'

import { motion } from 'framer-motion'

export type AnalysisMode = 'upwind' | 'downwind'

interface Props {
  mode: AnalysisMode
  onChange: (m: AnalysisMode) => void
}

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      {(['upwind', 'downwind'] as AnalysisMode[]).map((m) => {
        const active = mode === m
        const isUp   = m === 'upwind'
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '1rem' }}>{isUp ? '🧭' : '🌊'}</span>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.72rem',
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         active ? (isUp ? '#1A5276' : '#00695C') : '#0C0C0E',
              }}>
                {isUp ? 'Upwind' : 'Downwind'}
              </span>
            </div>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.72rem',
              color:      active ? (isUp ? '#1A5276' : '#00695C') : '#71717A',
              lineHeight: 1.4,
              margin:     0,
            }}>
              {isUp ? 'Give data → get instant precise strategy' : 'Answer 3 questions → guided discovery'}
            </p>
          </motion.button>
        )
      })}
    </div>
  )
}
