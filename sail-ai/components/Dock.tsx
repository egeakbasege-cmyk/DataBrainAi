'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Dock() {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)
  const { t } = useLanguage()

  const NAV = [
    {
      id:    'home',
      href:  '/',
      label: t('dock.home'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id:    'chart',
      href:  '/chat',
      label: t('dock.chartCourse'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="12" r="2.5" />
          <line x1="12" y1="2.5"  x2="12" y2="9.5" />
          <line x1="12" y1="14.5" x2="12" y2="21.5" />
          <line x1="2.5"  y1="12" x2="9.5"  y2="12" />
          <line x1="14.5" y1="12" x2="21.5" y2="12" />
        </svg>
      ),
    },
    {
      id:    'pricing',
      href:  '/pricing',
      label: t('dock.pricing'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50"
      style={{ transform: 'translateX(-50%)', animation: 'dockSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <nav
        className="flex items-center gap-1 px-3 py-2"
        style={{
          background:           'rgba(250,250,248,0.82)',
          backdropFilter:       'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border:               '1px solid rgba(12,12,14,0.1)',
          borderRadius:         '999px',
          boxShadow:            '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
        aria-label="Main navigation"
      >
        {NAV.map((item) => {
          const active    = isActive(item.href)
          const isHov     = hovered === item.id

          return (
            <Link key={item.id} href={item.href} aria-label={item.label}>
              <div
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex flex-col items-center justify-center"
                style={{
                  width:      '3rem',
                  height:     '3rem',
                  borderRadius: '50%',
                  background: active
                    ? 'rgba(201,169,110,0.12)'
                    : isHov
                    ? 'rgba(12,12,14,0.06)'
                    : 'transparent',
                  boxShadow:  active ? '0 0 0 1px rgba(201,169,110,0.35)' : 'none',
                  transform:  isHov ? 'scale(1.2) translateY(-6px)' : 'scale(1)',
                  transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.15s, box-shadow 0.15s',
                  cursor:     'pointer',
                }}
              >
                <span style={{ color: active ? '#C9A96E' : isHov ? '#0C0C0E' : '#A1A1AA' }}>
                  {item.icon}
                </span>

                {active && (
                  <span
                    className="absolute"
                    style={{
                      bottom:    '-4px',
                      width:     '5px',
                      height:    '5px',
                      borderRadius: '50%',
                      background: '#C9A96E',
                      boxShadow: '0 0 6px rgba(201,169,110,0.6)',
                    }}
                  />
                )}

                {isHov && (
                  <span
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{
                      top:           '-2.25rem',
                      padding:       '4px 10px',
                      background:    '#0C0C0E',
                      color:         '#FAFAF8',
                      fontSize:      '0.68rem',
                      fontFamily:    'Inter, sans-serif',
                      fontWeight:    500,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      boxShadow:     '0 2px 8px rgba(0,0,0,0.2)',
                      animation:     'dockFadeIn 0.1s ease both',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      <style>{`
        @keyframes dockSlideUp {
          from { transform: translateX(-50%) translateY(80px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes dockFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}
