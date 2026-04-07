'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    id:    'home',
    href:  '/',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id:    'analyse',
    href:  '/analyse',
    label: 'Analyse',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id:    'history',
    href:  '/history',
    label: 'History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
]

export function Dock() {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 no-print">
      <nav
        className="flex items-center gap-3 px-5 py-3"
        style={{
          background:           'rgba(255,255,255,0.55)',
          backdropFilter:       'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border:               '1px solid rgba(255,255,255,0.75)',
          borderRadius:         '999px',
          boxShadow:            '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
          animation:            'dockSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        aria-label="Main navigation"
      >
        {NAV.map((item) => {
          const active    = isActive(item.href)
          const isHovered = hovered === item.id

          return (
            <Link key={item.id} href={item.href} aria-label={item.label}>
              <div
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer"
                style={{
                  background: active
                    ? 'rgba(250,204,21,0.15)'
                    : isHovered
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(255,255,255,0.4)',
                  boxShadow:  active ? '0 0 0 1px rgba(250,204,21,0.4)' : 'none',
                  transform:  isHovered ? 'scale(1.35) translateY(-10px)' : 'scale(1)',
                  transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.15s, box-shadow 0.15s',
                }}
              >
                <span style={{ color: active ? '#1E293B' : isHovered ? '#334155' : '#94A3B8' }}>
                  {item.icon}
                </span>

                {active && (
                  <span
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#FACC15', boxShadow: '0 0 6px rgba(250,204,21,0.7)' }}
                  />
                )}

                {isHovered && (
                  <span
                    className="absolute -top-10 px-2.5 py-1.5 rounded-xl text-xs font-medium pointer-events-none whitespace-nowrap"
                    style={{
                      background:    '#FFFFFF',
                      border:        '1px solid #E5E7EB',
                      color:         '#334155',
                      boxShadow:     '0 2px 8px rgba(0,0,0,0.08)',
                      fontFamily:    'Inter, system-ui, sans-serif',
                      letterSpacing: '0.01em',
                      animation:     'dockFadeIn 0.12s ease both',
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
          from { transform: translateY(100px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes dockFadeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  )
}
