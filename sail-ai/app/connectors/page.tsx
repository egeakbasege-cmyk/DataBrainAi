'use client'

import { useState, useEffect } from 'react'
import { useLanguage }          from '@/lib/i18n/LanguageContext'
import { Nav }                  from '@/components/Nav'
import {
  ConnectorDock,
  useConnectorState,
  ALL_CONNECTORS,
  type ConnectorDef,
} from '@/components/ConnectorDock'
import Link from 'next/link'

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useLanguage()
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '0.25rem',
      padding:      '0.15rem 0.55rem',
      borderRadius: 999,
      background:   active ? 'rgba(201,169,110,0.1)' : 'rgba(0,0,0,0.04)',
      border:       `1px solid ${active ? 'rgba(201,169,110,0.35)' : 'rgba(0,0,0,0.08)'}`,
      fontFamily:   'Inter, sans-serif',
      fontSize:     '0.6rem',
      fontWeight:   600,
      letterSpacing:'0.07em',
      textTransform:'uppercase',
      color:        active ? '#C9A96E' : '#9CA3AF',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: active ? '#C9A96E' : '#9CA3AF',
        display: 'inline-block',
      }} />
      {t('conn.demoMode')}
    </span>
  )
}

// ── Connector card (expanded view) ───────────────────────────────────────────

function ConnectorCard({ c, active, onToggle }: { c: ConnectorDef; active: boolean; onToggle: () => void }) {
  const [imgError, setImgError] = useState(false)

  const logo = c.iconSlug && !imgError ? (
    <img
      src={`/icons/${c.iconSlug}-${active ? 'active' : 'inactive'}.svg`}
      alt={c.label}
      width={32}
      height={32}
      onError={() => setImgError(true)}
      style={{ display: 'block' }}
    />
  ) : (
    <span style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      width:          32,
      height:         32,
      borderRadius:   6,
      background:     active ? c.accentColor + '22' : '#F3F4F6',
      color:          active ? c.accentColor : '#9CA3AF',
      fontSize:       (c.letter?.length ?? 1) === 1 ? 18 : 22,
      fontWeight:     700,
      fontFamily:     'Inter, sans-serif',
    }}>
      {c.letter ?? c.label[0]}
    </span>
  )

  return (
    <button
      onClick={onToggle}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '0.5rem',
        padding:       '1rem 0.75rem 0.875rem',
        borderRadius:  '12px',
        border:        `1.5px solid ${active ? c.accentColor + '44' : 'rgba(0,0,0,0.07)'}`,
        background:    active ? c.accentColor + '08' : '#FAFAFA',
        cursor:        'pointer',
        textAlign:     'center',
        transition:    'all 0.15s',
        position:      'relative',
        minWidth:      0,
      }}
    >
      {active && (
        <span style={{
          position:   'absolute',
          top:        8,
          right:      8,
          width:      6,
          height:     6,
          borderRadius: '50%',
          background: c.accentColor,
        }} />
      )}
      {logo}
      <span style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.7rem',
        fontWeight: 600,
        color:      active ? c.accentColor : '#6B7280',
        lineHeight: 1.2,
      }}>
        {c.label}
      </span>
    </button>
  )
}

// ── Domain group section ──────────────────────────────────────────────────────

const DOMAIN_LABEL_KEYS: Record<string, string> = {
  ecommerce:  'conn.groupEcommerce',
  social:     'conn.groupSocial',
  creator:    'conn.groupCreator',
  secondhand: 'conn.groupResale',
  analytics:  'conn.groupAnalytics',
  local:      'conn.groupLocal',
}

const DOMAIN_ORDER = ['ecommerce', 'social', 'creator', 'secondhand', 'analytics', 'local']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConnectorsPage() {
  const { t } = useLanguage()
  const {
    enabledIds,
    analysisActive,
    toggle,
    setActive,
    enableAll,
    disableAll,
    mounted,
  } = useConnectorState()

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const activeCount = enabledIds.size
  const activeCountLabel = t('conn.activeCount').replace('{n}', String(activeCount))

  // Group connectors by domain
  const grouped = DOMAIN_ORDER.map(domain => ({
    domain,
    label:      t(DOMAIN_LABEL_KEYS[domain] as any),
    connectors: ALL_CONNECTORS.filter(c => c.domain === domain),
  })).filter(g => g.connectors.length > 0)

  return (
    <>
      <Nav />

      <main style={{
        minHeight:   '100vh',
        background:  '#FAFAF8',
        paddingTop:  '3rem',
        paddingBottom: '6rem',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1.25rem' }}>

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.6rem',
                fontWeight:    700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         '#C9A96E',
                background:    'rgba(201,169,110,0.1)',
                padding:       '0.2rem 0.6rem',
                borderRadius:  4,
                border:        '1px solid rgba(201,169,110,0.25)',
              }}>
                {t('conn.demoMode')}
              </span>
            </div>

            <h1 style={{
              fontFamily:  'Cormorant Garamond, Georgia, serif',
              fontSize:    isMobile ? '1.75rem' : '2.25rem',
              fontWeight:  600,
              color:       '#0C0C0E',
              margin:      0,
              lineHeight:  1.15,
              marginBottom: '0.625rem',
            }}>
              {t('conn.pageTitle')}
            </h1>

            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.875rem',
              color:      '#71717A',
              margin:     0,
              lineHeight: 1.6,
              maxWidth:   560,
            }}>
              {t('conn.pageSubtitle')}
            </p>
          </div>

          {/* ── Status notice ────────────────────────────────────────────── */}
          <div style={{
            background:   'rgba(201,169,110,0.06)',
            border:       '1px solid rgba(201,169,110,0.2)',
            borderRadius: '10px',
            padding:      '0.75rem 1rem',
            marginBottom: '2rem',
            display:      'flex',
            alignItems:   'flex-start',
            gap:          '0.625rem',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>⚡</span>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.78rem',
              color:      '#92400E',
              margin:     0,
              lineHeight: 1.55,
            }}>
              {t('conn.statusNote')}
            </p>
          </div>

          {/* ── Quick-toggle strip (ConnectorDock) ──────────────────────── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <ConnectorDock
              enabledIds={enabledIds}
              analysisActive={analysisActive}
              onToggle={toggle}
              onSetActive={setActive}
              onEnableAll={enableAll}
              onDisableAll={disableAll}
              onImportClick={() => {}}
            />
          </div>

          {/* ── Active count pill ────────────────────────────────────────── */}
          {mounted && (
            <div style={{ marginBottom: '1.75rem' }}>
              {activeCount === 0 ? (
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize:   '0.8rem',
                  color:      '#EF4444',
                  background: 'rgba(239,68,68,0.06)',
                  border:     '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 8,
                  padding:    '0.6rem 1rem',
                  margin:     0,
                }}>
                  {t('conn.noneActive')}
                </p>
              ) : (
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize:   '0.78rem',
                  color:      '#C9A96E',
                  margin:     0,
                  fontWeight: 600,
                }}>
                  ✓ {activeCountLabel}
                </p>
              )}
            </div>
          )}

          {/* ── Expanded connector grid ──────────────────────────────────── */}
          {grouped.map(group => (
            <div key={group.domain} style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.62rem',
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         '#C4C4CC',
                margin:        '0 0 0.75rem 0',
              }}>
                {group.label}
              </h3>
              <div style={{
                display:             'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(3, 1fr)'
                  : 'repeat(6, 1fr)',
                gap: '0.5rem',
              }}>
                {group.connectors.map(c => (
                  <ConnectorCard
                    key={c.id}
                    c={c}
                    active={analysisActive && enabledIds.has(c.id)}
                    onToggle={() => toggle(c.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* ── CTA: go to research ──────────────────────────────────────── */}
          <div style={{
            marginTop:    '3rem',
            padding:      '2rem',
            background:   'linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(201,169,110,0.02) 100%)',
            border:       '1.5px solid rgba(201,169,110,0.2)',
            borderRadius: '16px',
            textAlign:    'center',
          }}>
            <p style={{
              fontFamily:  'Cormorant Garamond, Georgia, serif',
              fontSize:    '1.3rem',
              fontWeight:  600,
              color:       '#0C0C0E',
              margin:      '0 0 0.5rem 0',
            }}>
              Ready to run deep research?
            </p>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.82rem',
              color:      '#71717A',
              margin:     '0 0 1.25rem 0',
              lineHeight: 1.6,
            }}>
              Active connectors enrich AI analysis with real-time market context.
            </p>
            <Link
              href="/research"
              style={{
                display:       'inline-block',
                padding:       '0.65rem 1.75rem',
                background:    'linear-gradient(135deg, #C9A96E, #B8924F)',
                color:         '#FFFFFF',
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.78rem',
                fontWeight:    600,
                letterSpacing: '0.06em',
                borderRadius:  '8px',
                textDecoration:'none',
                boxShadow:     '0 2px 12px rgba(201,169,110,0.35)',
              }}
            >
              {t('nav.research')} →
            </Link>
          </div>

        </div>
      </main>
    </>
  )
}
