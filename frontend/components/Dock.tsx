'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    id:    'home',
    href:  '/',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id:    'history',
    href:  '/history',
    label: 'History',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
]

export function Dock() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 no-print"
      style={{ transform: 'translateX(-50%)', animation: 'dockIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards' }}>
      <nav
        className="flex items-center gap-1 px-3 py-2.5"
        style={{
          background:      'rgba(255,255,255,0.75)',
          backdropFilter:  'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border:          '1px solid rgba(229,231,235,0.9)',
          borderRadius:    '999px',
          boxShadow:       '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        }}
        aria-label="Main navigation"
      >
        {NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              className="relative group flex flex-col items-center justify-center w-14 h-11 rounded-full transition-all duration-200"
              style={{
                background: active ? 'rgba(250,204,21,0.12)' : 'transparent',
                color:      active ? '#111827' : '#9CA3AF',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F7'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              {/* Active dot */}
              {active && (
                <span
                  className="absolute -top-0.5 w-1 h-1 rounded-full"
                  style={{ background: '#FACC15', boxShadow: '0 0 6px rgba(250,204,21,0.6)' }}
                />
              )}

              {/* Icon */}
              <span style={{ color: active ? '#111827' : '#9CA3AF' }}>
                {item.icon}
              </span>

              {/* Tooltip */}
              <span
                className="absolute -top-9 scale-0 group-hover:scale-100 transition-transform duration-150 origin-bottom px-2.5 py-1.5 text-xs font-medium rounded-lg pointer-events-none"
                style={{
                  background:  '#FFFFFF',
                  border:      '1px solid #E5E7EB',
                  color:       '#374151',
                  boxShadow:   '0 2px 8px rgba(0,0,0,0.08)',
                  fontFamily:  'Inter, system-ui, sans-serif',
                  whiteSpace:  'nowrap',
                  letterSpacing: '0.01em',
                }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
