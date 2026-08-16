'use client'

/**
 * ChatHeader — 56px Precision Bar
 * ─────────────────────────────────────────────────────────────────────────────
 * Swiss precision top bar. Communicates: current mode, profile context,
 * usage counter, session history access, and reset.
 *
 * Grid: 56px fixed height · 24px horizontal padding · 8pt internal spacing
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { DailyCounter }            from '@/components/DailyCounter'
import { BrandNameplate }          from '@/components/BrandSetupModal'
import type { BrandConfig }        from '@/components/BrandSetupModal'

// ── Mode registry ─────────────────────────────────────────────────────────────

const MODE_META: Record<AnalysisMode, { label: string; color: string }> = {
  upwind:    { label: 'Upwind',    color: '#0F6CBD' },
  downwind:  { label: 'Downwind',  color: '#00695C' },
  sail:      { label: 'SAIL',      color: '#7C3AED' },
  trim:      { label: 'TRIM',      color: '#B45309' },
  catamaran: { label: 'Catamaran', color: '#D4AF37' },
  operator:  { label: 'Operator',  color: '#CC2200' },
  synergy:   { label: 'Synergy',   color: '#C9A96E' },
  scenario:  { label: 'Scenario',  color: '#00C9B1' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatHeaderProps {
  mode:           AnalysisMode
  isActive:       boolean
  isPro:          boolean
  usedToday:      number
  hasContext:      boolean
  useProfileCtx:  boolean
  businessMode:   boolean
  hasHistory:     boolean
  hasMessages:    boolean
  apiKey:         string
  brandConfig:    BrandConfig | null
  contextLabel:   string

  onToggleCtx:      () => void
  onToggleBusiness: () => void
  onUpgradePro:     () => void
  onHistory:        () => void
  onReset:          () => void
  onBrandEdit:      () => void
  onSettings:       () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatHeader({
  mode, isActive, isPro, usedToday,
  hasContext, useProfileCtx, businessMode, hasHistory, hasMessages, apiKey,
  brandConfig, contextLabel,
  onToggleCtx, onToggleBusiness, onUpgradePro, onHistory, onReset, onBrandEdit, onSettings,
}: ChatHeaderProps) {
  const meta = MODE_META[mode]

  return (
    <div
      style={{
        height:              56,
        flexShrink:          0,
        display:             'flex',
        alignItems:          'center',
        gap:                 8,
        padding:             '0 24px',
        background:          'rgba(255,255,255,0.88)',
        backdropFilter:      'blur(40px)',
        WebkitBackdropFilter:'blur(40px)',
        borderBottom:        '1px solid rgba(255,255,255,0.95)',
        boxShadow:           '0 1px 0 rgba(0,0,0,0.04)',
        position:            'relative',
        zIndex:              10,
      }}
    >
      {/* ── LEFT: Mode indicator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {/* Mode dot */}
        <motion.span
          animate={isActive
            ? { opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }
            : { opacity: 0.7, scale: 1 }}
          transition={{ duration: 1.1, repeat: isActive ? Infinity : 0 }}
          style={{
            display:      'inline-block',
            width:         8,
            height:        8,
            borderRadius: '50%',
            background:   meta.color,
            flexShrink:   0,
            boxShadow:    isActive ? `0 0 8px ${meta.color}88` : 'none',
          }}
        />
        {/* Mode label */}
        <span style={{
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         meta.color,
          flexShrink:    0,
        }}>
          {meta.label}
        </span>
        {/* Active indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:   10,
                color:      'rgba(20,184,166,0.7)',
                fontStyle:  'italic',
                letterSpacing: '0.02em',
              }}
            >
              · Processing…
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── CENTER: Brand nameplate or context label ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {brandConfig ? (
          <BrandNameplate config={brandConfig} onEdit={onBrandEdit} />
        ) : hasContext && contextLabel ? (
          <span style={{
            fontFamily:  'var(--font-inter), sans-serif',
            fontSize:    11,
            color:       '#9CA3AF',
            textAlign:   'center',
            overflow:    'hidden',
            textOverflow:'ellipsis',
            whiteSpace:  'nowrap',
            maxWidth:    240,
            letterSpacing: '0.01em',
          }}>
            {contextLabel}
          </span>
        ) : null}
      </div>

      {/* ── RIGHT: Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Profile context toggle */}
        <motion.button
          onClick={onToggleCtx}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title={useProfileCtx ? 'Profile context on' : 'Profile context off'}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:            4,
            padding:       '4px 10px',
            borderRadius:  9999,
            background:    useProfileCtx
              ? 'linear-gradient(135deg, rgba(6,78,59,0.55) 0%, rgba(16,185,129,0.12) 100%)'
              : 'rgba(0,0,0,0.04)',
            border:        `1px solid ${useProfileCtx ? 'rgba(16,185,129,0.45)' : 'rgba(0,0,0,0.08)'}`,
            cursor:        'pointer',
            transition:    'all 0.2s',
            flexShrink:    0,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke={useProfileCtx ? '#10B981' : '#9CA3AF'}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <span style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      10,
            fontWeight:    600,
            letterSpacing: '0.08em',
            color:         useProfileCtx ? '#34D399' : '#9CA3AF',
          }}>
            CTX
          </span>
        </motion.button>

        {/* Business/Chat mode toggle */}
        <motion.button
          onClick={onToggleBusiness}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title={businessMode ? 'Business mode' : 'Free chat mode'}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:            4,
            padding:       '4px 10px',
            borderRadius:  9999,
            background:    businessMode
              ? 'linear-gradient(135deg, rgba(6,78,59,0.55) 0%, rgba(16,185,129,0.12) 100%)'
              : 'rgba(0,0,0,0.04)',
            border:        `1px solid ${businessMode ? 'rgba(16,185,129,0.45)' : 'rgba(0,0,0,0.08)'}`,
            cursor:        'pointer',
            transition:    'all 0.2s',
            flexShrink:    0,
          }}
        >
          <span style={{ fontSize: 9, lineHeight: 1 }}>{businessMode ? '💼' : '💬'}</span>
          <span style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      10,
            fontWeight:    600,
            color:         businessMode ? '#34D399' : '#9CA3AF',
          }}>
            {businessMode ? 'BIZ' : 'CHAT'}
          </span>
        </motion.button>

        {/* API key dot */}
        {apiKey && (
          <button
            onClick={onSettings}
            title="Custom API key active"
            style={{
              width:        24,
              height:       24,
              borderRadius: '50%',
              background:   'rgba(201,169,110,0.1)',
              border:       '1px solid rgba(201,169,110,0.4)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              flexShrink:   0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="#C9A96E" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </button>
        )}

        {/* History button */}
        {hasHistory && (
          <button
            onClick={onHistory}
            title="Session history"
            style={{
              width:        32,
              height:       32,
              borderRadius: 8,
              background:   'rgba(201,169,110,0.06)',
              border:       '1px solid rgba(201,169,110,0.2)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              flexShrink:   0,
              transition:   'background 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </button>
        )}

        {/* Reset button */}
        {hasMessages && (
          <button
            onClick={onReset}
            title="New topic"
            style={{
              width:        32,
              height:       32,
              borderRadius: 8,
              background:   'rgba(0,0,0,0.04)',
              border:       '1px solid rgba(0,0,0,0.08)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              flexShrink:   0,
              transition:   'background 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </button>
        )}

        {/* Pro badge / Upgrade */}
        {isPro ? (
          <span style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         '#C9A96E',
            background:    'rgba(201,169,110,0.1)',
            border:        '1px solid rgba(201,169,110,0.3)',
            borderRadius:  4,
            padding:       '2px 6px',
            flexShrink:    0,
          }}>
            PRO
          </span>
        ) : (
          <motion.button
            onClick={onUpgradePro}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding:       '4px 12px',
              background:    'linear-gradient(135deg, #064E3B 0%, #065F46 45%, #0F2417 100%)',
              border:        '1.5px solid rgba(16,185,129,0.55)',
              borderRadius:  9999,
              cursor:        'pointer',
              fontFamily:    'var(--font-inter), sans-serif',
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         '#6EE7B7',
              flexShrink:    0,
            }}
          >
            PRO ↑
          </motion.button>
        )}

        {/* Daily counter */}
        <DailyCounter used={usedToday} isPro={isPro} />
      </div>
    </div>
  )
}
