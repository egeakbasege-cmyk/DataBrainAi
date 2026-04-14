'use client'

import Link     from 'next/link'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Logo }               from './Logo'
import { LanguageSelector }   from './LanguageSelector'
import { useLanguage }        from '@/lib/i18n/LanguageContext'

export function Nav() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const initial = session?.user?.name?.[0]?.toUpperCase()
    ?? session?.user?.email?.[0]?.toUpperCase()
    ?? '?'

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res  = await fetch('/api/subscription/portal', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      alert(err.message)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <header
      style={{
        position:    'sticky',
        top:         0,
        zIndex:      30,
        background:  'rgba(250,250,248,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom:'1px solid rgba(0,0,0,0.09)',
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6 md:px-10"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.75rem' }}
      >
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Logo size={26} />
          <span style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:      '1rem',
            fontWeight:    600,
            color:         '#0C0C0E',
            letterSpacing: '0.07em',
          }}>
            SAIL AI
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <LanguageSelector />
          <Link
            href="/pricing"
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6875rem',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         '#71717A',
              textDecoration:'none',
            }}
          >
            {t('nav.pricing')}
          </Link>

          {session?.user ? (
            /* User avatar + dropdown */
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  width:          '2rem',
                  height:         '2rem',
                  borderRadius:   '50%',
                  background:     session.user.isPro ? 'rgba(201,169,110,0.15)' : 'rgba(12,12,14,0.08)',
                  border:         session.user.isPro ? '1.5px solid rgba(201,169,110,0.5)' : '1.5px solid rgba(12,12,14,0.15)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontFamily:     'Inter, sans-serif',
                  fontSize:       '0.75rem',
                  fontWeight:     600,
                  color:          session.user.isPro ? '#C9A96E' : '#0C0C0E',
                  cursor:         'pointer',
                  overflow:       'hidden',
                  padding:        0,
                }}
                aria-label="Account menu"
              >
                {session.user.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={session.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : initial}
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  />
                  {/* Dropdown */}
                  <div style={{
                    position:  'absolute',
                    top:       'calc(100% + 0.5rem)',
                    right:     0,
                    zIndex:    41,
                    background:'#FFFFFF',
                    border:    '1px solid rgba(12,12,14,0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.09)',
                    minWidth:  '190px',
                    padding:   '0.375rem 0',
                  }}>
                    <div style={{
                      padding:    '0.625rem 1rem',
                      borderBottom: '1px solid rgba(12,12,14,0.07)',
                    }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 500, color: '#0C0C0E', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.user.name ?? session.user.email}
                      </p>
                      {session.user.isPro && (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#C9A96E', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: '2px' }}>
                          {t('nav.professional')}
                        </p>
                      )}
                    </div>

                    <MenuItem href="/chat"      onClick={() => setMenuOpen(false)} label={t('nav.chartCourse')} />
                    <MenuItem href="/dashboard" onClick={() => setMenuOpen(false)} label={t('nav.dashboard')}   />
                    <MenuItem href="/pricing"   onClick={() => setMenuOpen(false)} label={t('nav.pricing')}     />

                    {session.user.isPro && (
                      <button
                        onClick={() => { setMenuOpen(false); handleManageSubscription() }}
                        disabled={portalLoading}
                        style={{
                          width:         '100%',
                          textAlign:     'left',
                          padding:       '0.5rem 1rem',
                          fontFamily:    'Inter, sans-serif',
                          fontSize:      '0.8rem',
                          color:         '#C9A96E',
                          background:    'none',
                          border:        'none',
                          cursor:        portalLoading ? 'wait' : 'pointer',
                          opacity:       portalLoading ? 0.6 : 1,
                        }}
                      >
                        {portalLoading ? t('nav.loading') : t('nav.manageSubscription')}
                      </button>
                    )}

                    <div style={{ height: 1, background: 'rgba(12,12,14,0.07)', margin: '0.25rem 0' }} />

                    <button
                      onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                      style={{
                        width:         '100%',
                        textAlign:     'left',
                        padding:       '0.5rem 1rem',
                        fontFamily:    'Inter, sans-serif',
                        fontSize:      '0.8rem',
                        color:         '#71717A',
                        background:    'none',
                        border:        'none',
                        cursor:        'pointer',
                      }}
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/onboarding" className="btn-primary" style={{ padding: '0.5625rem 1.25rem', fontSize: '0.7rem' }}>
              {t('nav.launch')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function MenuItem({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display:    'block',
        padding:    '0.5rem 1rem',
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.8rem',
        color:      '#0C0C0E',
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  )
}
