'use client'

import Link                  from 'next/link'
import { useState, useEffect } from 'react'
import { useSession, signOut }  from 'next-auth/react'
import { usePathname }          from 'next/navigation'
import { Logo }                 from './Logo'
import { LanguageSelector }     from './LanguageSelector'
import { useLanguage }          from '@/lib/i18n/LanguageContext'

export function Nav() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const pathname = usePathname()
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState<string | null>(null)
  const [scrolled,      setScrolled]      = useState(false)

  // Scroll-aware transparency: only on the landing page
  const isLanding = pathname === '/'
  useEffect(() => {
    if (!isLanding) return
    const onScroll = () => setScrolled(window.scrollY > 72)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isLanding])

  const initial = session?.user?.name?.[0]?.toUpperCase()
    ?? session?.user?.email?.[0]?.toUpperCase()
    ?? '?'

  async function handleManageSubscription() {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res  = await fetch('/api/subscription/portal', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: unknown) {
      // M-1: err typed as unknown — guard before accessing .message
      const message = err instanceof Error ? err.message : 'Unable to open billing portal. Please try again.'
      setPortalError(message)
    } finally {
      setPortalLoading(false)
    }
  }

  // On landing: transparent until scrolled. On all other pages: always frosted.
  const navBg = isLanding && !scrolled
    ? 'transparent'
    : 'rgba(250,250,248,0.96)'
  const navBlur = isLanding && !scrolled ? 'none' : 'blur(18px)'
  // Text colours flip to white when nav is transparent over dark hero
  const navLinkColor = isLanding && !scrolled ? 'rgba(255,255,255,0.65)' : '#71717A'
  const navResearchColor = isLanding && !scrolled ? 'rgba(201,169,110,0.85)' : '#C9A96E'
  const navBrandColor = isLanding && !scrolled ? '#FFFFFF' : '#0C0C0E'

  return (
    <header
      style={{
        position:             'sticky',
        top:                  0,
        zIndex:               30,
        background:           navBg,
        backdropFilter:       navBlur,
        WebkitBackdropFilter: navBlur,
        transition:           'background 0.4s ease, backdrop-filter 0.4s ease',
        borderBottom:         'none',
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6 md:px-10"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.75rem' }}
      >
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Logo size={26} />
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontSize:      '1rem',
              fontWeight:    600,
              color:         navBrandColor,
              letterSpacing: '0.07em',
              transition:    'color 0.4s',
            }}>
              SAIL
            </span>
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.55rem',
              fontWeight:    700,
              letterSpacing: '0.06em',
              color:         '#FFFFFF',
              background:    'linear-gradient(135deg, rgba(20,184,166,0.8), rgba(14,165,148,0.9))',
              padding:       '1px 5px',
              borderRadius:  '3px',
              filter:        'drop-shadow(0 0 4px rgba(148,163,184,0.5))',
              lineHeight:    1,
              alignSelf:     'center',
            }}>
              AI+
            </span>
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <LanguageSelector />
          <Link
            href="/research"
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6875rem',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         navResearchColor,
              textDecoration:'none',
              borderBottom:  '1px solid rgba(20,184,166,0.4)',
              paddingBottom: '1px',
              transition:    'color 0.4s',
            }}
          >
            {t('nav.research')}
          </Link>
          <Link
            href="/data-lab"
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6875rem',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         navLinkColor,
              textDecoration:'none',
              transition:    'color 0.4s',
            }}
          >
            {t('nav.dataLab')}
          </Link>
          <Link
            href="/pricing"
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6875rem',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         navLinkColor,
              textDecoration:'none',
              transition:    'color 0.4s',
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

                    <MenuItem href="/chat"        onClick={() => setMenuOpen(false)} label={t('nav.chartCourse')} />
                    <MenuItem href="/research"   onClick={() => setMenuOpen(false)} label={t('nav.research')}    />
                    <MenuItem href="/data-lab"   onClick={() => setMenuOpen(false)} label={t('nav.dataLab')}      />
                    <MenuItem href="/vault"      onClick={() => setMenuOpen(false)} label={t('nav.dataVault')}   />
                    <MenuItem href="/dashboard"  onClick={() => setMenuOpen(false)} label={t('nav.dashboard')}   />
                    <MenuItem href="/pricing"    onClick={() => setMenuOpen(false)} label={t('nav.pricing')}     />

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

                    {portalError && (
                      <p style={{
                        margin:     '0 1rem 0.4rem',
                        fontSize:   '0.72rem',
                        color:      '#DC2626',
                        fontFamily: 'Inter, sans-serif',
                        lineHeight: 1.35,
                      }}>
                        {portalError}
                      </p>
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
      {/* Gradient bottom border replacing solid border */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(20,184,166,0.25) 30%, rgba(201,169,110,0.3) 70%, transparent 100%)' }} />
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
