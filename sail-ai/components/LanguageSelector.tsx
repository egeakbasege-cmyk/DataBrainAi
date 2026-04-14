'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LOCALES } from '@/lib/i18n/translations'

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  const current = LOCALES.find(l => l.code === locale) ?? LOCALES[0]

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Language: ${current.native}`}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '0.35rem',
          padding:        '0.3rem 0.55rem',
          border:         `1px solid ${open ? 'rgba(201,169,110,0.5)' : 'rgba(12,12,14,0.12)'}`,
          borderRadius:   '6px',
          background:     open ? 'rgba(201,169,110,0.06)' : 'transparent',
          cursor:         'pointer',
          transition:     'all 0.15s',
        }}
      >
        <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{current.flag}</span>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.65rem',
          fontWeight:    600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         open ? '#C9A96E' : '#71717A',
        }}>
          {current.code.toUpperCase()}
        </span>
        {/* Chevron */}
        <svg
          width="8" height="8" viewBox="0 0 10 6" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M1 1l4 4 4-4" stroke={open ? '#C9A96E' : '#A1A1AA'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -4, scale: 0.97  }}
            transition={{ duration: 0.14 }}
            style={{
              position:  'absolute',
              top:       'calc(100% + 0.375rem)',
              right:     0,
              zIndex:    50,
              background:'#FFFFFF',
              border:    '1px solid rgba(12,12,14,0.1)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              overflow:  'hidden',
              minWidth:  '148px',
            }}
          >
            {LOCALES.map(l => {
              const active = l.code === locale
              return (
                <button
                  key={l.code}
                  onClick={() => { setLocale(l.code); setOpen(false) }}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '0.625rem',
                    width:          '100%',
                    padding:        '0.5rem 0.875rem',
                    background:     active ? 'rgba(201,169,110,0.07)' : 'transparent',
                    border:         'none',
                    cursor:         'pointer',
                    textAlign:      'left',
                    transition:     'background 0.12s',
                  }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{l.flag}</span>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '0.8rem',
                    fontWeight: active ? 600 : 400,
                    color:      active ? '#C9A96E' : '#0C0C0E',
                    flex:       1,
                  }}>
                    {l.native}
                  </span>
                  {active && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
