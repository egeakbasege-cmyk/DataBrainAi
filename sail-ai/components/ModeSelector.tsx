'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { AnalysisMode } from '@/types/chat'

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

function SailIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Yacht silhouette - sleek modern design */}
      <path 
        d="M3 16 L12 4 L12 16 Z" 
        fill={color} 
        opacity="0.9"
      />
      <path 
        d="M12 6 L21 16 L12 16 Z" 
        fill={color} 
        opacity="0.55"
      />
      {/* Mast */}
      <line x1="12" y1="3" x2="12" y2="17" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Sleek hull */}
      <path 
        d="M2 16 Q5 17 12 17 Q19 17 22 16" 
        stroke={color} 
        strokeWidth="1.6" 
        strokeLinecap="round" 
        fill="none"
      />
      <path 
        d="M4 17 Q12 20 20 17" 
        stroke={color} 
        strokeWidth="1.2" 
        strokeLinecap="round" 
        fill="none"
        opacity="0.7"
      />
      {/* AI/Adaptive indicator - rotating arrows */}
      <circle cx="19" cy="6" r="3" stroke={color} strokeWidth="0.8" fill="none" opacity="0.5"/>
      <path d="M17.5 6 L19 4.5 L20.5 6" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      <path d="M20.5 6 L19 7.5 L17.5 6" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
    </svg>
  )
}

function getModeConfig(m: AnalysisMode) {
  switch (m) {
    case 'upwind':
      return {
        color: '#1A5276',
        borderActive: 'rgba(26,82,118,0.6)',
        bgActive: 'rgba(26,82,118,0.08)',
        Icon: UpwindIcon,
      }
    case 'downwind':
      return {
        color: '#00695C',
        borderActive: 'rgba(0,150,136,0.6)',
        bgActive: 'rgba(0,150,136,0.07)',
        Icon: DownwindIcon,
      }
    case 'sail':
      return {
        color: '#7C3AED', // Purple for adaptive AI
        borderActive: 'rgba(124,58,237,0.6)',
        bgActive: 'rgba(124,58,237,0.08)',
        Icon: SailIcon,
      }
  }
}

export function ModeSelector({ mode, onChange }: Props) {
  const { t } = useLanguage()
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
      {(['upwind', 'downwind', 'sail'] as AnalysisMode[]).map((m) => {
        const active = mode === m
        const config = getModeConfig(m)
        const iconColor = active ? config.color : '#71717A'
        const { Icon } = config
        
        return (
          <motion.button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '0.875rem 0.75rem',
              border: `1px solid ${active ? config.borderActive : 'rgba(12,12,14,0.1)'}`,
              background: active ? config.bgActive : '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.18s',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Icon color={iconColor} />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? config.color : '#0C0C0E',
              }}>
                {t(`mode.${m}`)}
              </span>
            </div>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.65rem',
              color: active ? config.color : '#71717A',
              lineHeight: 1.35,
              margin: 0,
            }}>
              {t(`mode.${m}Desc`)}
            </p>
          </motion.button>
        )
      })}
    </div>
  )
}
