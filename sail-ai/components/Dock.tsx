'use client'

/**
 * Dock — Global navigation bar (bottom-fixed)
 * ─────────────────────────────────────────────
 * Items:
 *  Home | Chat | DataLab | Pricing
 *
 * User-type switcher pill floats above the dock on the chat route.
 * Persists selection in localStorage: sail_user_type = 'business' | 'consumer'
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export const USER_TYPE_KEY = 'sail_user_type'
export type  UserType      = 'business' | 'consumer'

// Public helper so other pages can read it synchronously
export function getUserType(): UserType {
  if (typeof window === 'undefined') return 'business'
  return (localStorage.getItem(USER_TYPE_KEY) as UserType) ?? 'business'
}

export function setUserType(t: UserType) {
  if (typeof window !== 'undefined') localStorage.setItem(USER_TYPE_KEY, t)
  window.dispatchEvent(new CustomEvent('sail:usertype', { detail: t }))
}

// ── Hook for listening to user-type changes ───────────────────
export function useUserType() {
  const [type, setType] = useState<UserType>('business')

  useEffect(() => {
    setType(getUserType())
    const handler = (e: Event) => setType((e as CustomEvent<UserType>).detail)
    window.addEventListener('sail:usertype', handler)
    return () => window.removeEventListener('sail:usertype', handler)
  }, [])

  const toggle = () => {
    const next: UserType = type === 'business' ? 'consumer' : 'business'
    setUserType(next)
    setType(next)
  }

  return { type, toggle, setType: (t: UserType) => { setUserType(t); setType(t) } }
}

// ── Nav items ─────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="2.5"  x2="12" y2="9.5" />
      <line x1="12" y1="14.5" x2="12" y2="21.5" />
      <line x1="2.5"  y1="12" x2="9.5"  y2="12" />
      <line x1="14.5" y1="12" x2="21.5" y2="12" />
    </svg>
  )
}
function DataLabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
function PricingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

// ── Dock item ─────────────────────────────────────────────────

function DockItem({
  id, href, label, icon, active, hovered,
  onMouseEnter, onMouseLeave,
}: {
  id:           string
  href:         string
  label:        string
  icon:         React.ReactNode
  active:       boolean
  hovered:      boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <Link href={href} aria-label={label}>
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position:   'relative',
          display:    'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width:      '3rem',
          height:     '3rem',
          borderRadius: '50%',
          background: active
            ? 'rgba(201,169,110,0.12)'
            : hovered
            ? 'rgba(12,12,14,0.06)'
            : 'transparent',
          boxShadow:  active ? '0 0 0 1px rgba(201,169,110,0.35)' : 'none',
          transform:  hovered ? 'scale(1.2) translateY(-6px)' : 'scale(1)',
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.15s, box-shadow 0.15s',
          cursor:     'pointer',
        }}
      >
        <span style={{ color: active ? '#C9A96E' : hovered ? '#0C0C0E' : '#A1A1AA' }}>
          {icon}
        </span>

        {/* Active dot */}
        {active && (
          <span style={{
            position:     'absolute',
            bottom:       '-4px',
            width:        '5px',
            height:       '5px',
            borderRadius: '50%',
            background:   '#C9A96E',
            boxShadow:    '0 0 6px rgba(201,169,110,0.6)',
          }} />
        )}

        {/* Hover label */}
        {hovered && (
          <span style={{
            position:      'absolute',
            top:           '-2.25rem',
            padding:       '4px 10px',
            background:    '#0C0C0E',
            color:         '#FAFAF8',
            fontSize:      '0.68rem',
            fontFamily:    'Inter, sans-serif',
            fontWeight:    500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderRadius:  '5px',
            whiteSpace:    'nowrap',
            pointerEvents: 'none',
            boxShadow:     '0 2px 8px rgba(0,0,0,0.2)',
            animation:     'dockFadeIn 0.1s ease both',
          }}>
            {label}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Main Dock ─────────────────────────────────────────────────

export function Dock() {
  const pathname    = usePathname()
  const [hovered, setHovered]   = useState<string | null>(null)
  const { type: userType, toggle } = useUserType()
  const { t } = useLanguage()

  const NAV = [
    { id: 'home',    href: '/',         label: t('dock.home'),       icon: <HomeIcon />    },
    { id: 'chat',    href: '/chat',     label: t('dock.chartCourse'),icon: <ChatIcon />    },
    { id: 'datalab', href: '/data-lab', label: 'DataLab',            icon: <DataLabIcon /> },
    { id: 'pricing', href: '/pricing',  label: t('dock.pricing'),    icon: <PricingIcon /> },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const onChat = pathname.startsWith('/chat')

  return (
    <>
      {/* ── User-type switcher — shown on /chat ────────────── */}
      {onChat && (
        <div style={{
          position:  'fixed',
          bottom:    '5.5rem',
          left:      '50%',
          transform: 'translateX(-50%)',
          zIndex:    48,
          animation: 'dockSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <button
            onClick={toggle}
            title={userType === 'business'
              ? 'Switch to Personal AI mode'
              : 'Switch to Business / Analytics mode'}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '0.5rem',
              padding:        '0.35rem 0.875rem',
              background:     userType === 'business'
                ? 'linear-gradient(135deg, rgba(6,78,59,0.75) 0%, rgba(16,185,129,0.18) 100%)'
                : 'rgba(255,255,255,0.85)',
              backdropFilter:  'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border:         userType === 'business'
                ? '1px solid rgba(16,185,129,0.4)'
                : '1px solid rgba(201,169,110,0.35)',
              borderRadius:   '999px',
              cursor:         'pointer',
              fontFamily:     'Inter, sans-serif',
              fontSize:       '0.68rem',
              fontWeight:     600,
              letterSpacing:  '0.06em',
              color:          userType === 'business' ? '#34D399' : '#B8902A',
              boxShadow:      '0 4px 16px rgba(0,0,0,0.1)',
              transition:     'all 0.2s',
            }}
          >
            <span>{userType === 'business' ? '💼' : '✨'}</span>
            <span>{userType === 'business' ? 'Business Mode' : 'Personal Mode'}</span>
            <span style={{ opacity: 0.5, fontSize: '0.6rem' }}>↕</span>
          </button>
        </div>
      )}

      {/* ── Main dock bar ──────────────────────────────────── */}
      <div
        className="fixed bottom-6 left-1/2 z-50"
        style={{
          transform: 'translateX(-50%)',
          animation: 'dockSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <nav
          style={{
            display:              'flex',
            alignItems:           'center',
            gap:                  '0.25rem',
            padding:              '0.5rem 0.75rem',
            background:           'rgba(250,250,248,0.82)',
            backdropFilter:       'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border:               '1px solid rgba(12,12,14,0.1)',
            borderRadius:         '999px',
            boxShadow:            '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
          aria-label="Main navigation"
        >
          {NAV.map(item => (
            <DockItem
              key={item.id}
              id={item.id}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              hovered={hovered === item.id}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
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
    </>
  )
}
