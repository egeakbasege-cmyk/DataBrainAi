'use client'

import { useState, useRef, useEffect } from 'react'
import type { AgentMode } from '@/types/chat'

const MODES: { id: AgentMode; label: string; desc: string }[] = [
  { id: 'auto',      label: 'Auto',      desc: 'Best fit selected per input and benchmark data'  },
  { id: 'strategy',  label: 'Strategy',  desc: 'Long-term decisions, planning, positioning'       },
  { id: 'analysis',  label: 'Analysis',  desc: 'Benchmark comparisons, summaries, documents'      },
  { id: 'execution', label: 'Execution', desc: 'Action plans, next steps, implementation'         },
  { id: 'review',    label: 'Review',    desc: 'Risk assessment, quality checks, consistency'     },
]

interface Props {
  value:    AgentMode
  onChange: (m: AgentMode) => void
  /** 'light' for bright backgrounds (chat), 'dark' for dark hero sections */
  variant?: 'light' | 'dark'
}

export function AgentModeButton({ value, onChange, variant = 'light' }: Props) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const current = MODES.find(m => m.id === value)!
  const d       = variant === 'dark'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Agent mode"
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '0.375rem',
          padding:       '0.3rem 0.7rem',
          background:    d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          border:        `1px solid ${d ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
          color:         d ? 'rgba(255,255,255,0.65)' : '#3A3A3C',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.68rem',
          fontWeight:    500,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          cursor:        'pointer',
          borderRadius:  '3px',
          transition:    'background 0.15s, border-color 0.15s',
          whiteSpace:    'nowrap',
        }}
      >
        <span style={{ color: '#C9A96E', fontSize: '0.42rem', lineHeight: 1, flexShrink: 0 }}>◆</span>
        {current.label}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
          stroke={d ? 'rgba(255,255,255,0.3)' : '#A1A1AA'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position:  'absolute',
            top:       'calc(100% + 4px)',
            right:     0,
            width:     '224px',
            background:'#0C0C0E',
            border:    '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            zIndex:    60,
          }}
        >
          {MODES.map((m, i) => (
            <button
              key={m.id}
              role="option"
              aria-selected={m.id === value}
              onClick={() => { onChange(m.id); setOpen(false) }}
              style={{
                display:       'flex',
                flexDirection: 'column',
                width:         '100%',
                padding:       '0.65rem 1rem',
                background:    m.id === value ? 'rgba(201,169,110,0.09)' : 'transparent',
                border:        'none',
                borderBottom:  i < MODES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                cursor:        'pointer',
                textAlign:     'left',
                transition:    'background 0.12s',
              }}
            >
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.68rem',
                fontWeight:    600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         m.id === value ? '#C9A96E' : 'rgba(255,255,255,0.78)',
              }}>
                {m.label}
              </span>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   '0.65rem',
                color:      'rgba(255,255,255,0.3)',
                marginTop:  '0.15rem',
                lineHeight: 1.4,
              }}>
                {m.desc}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
