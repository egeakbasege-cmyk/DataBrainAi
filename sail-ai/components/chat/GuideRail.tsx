'use client'

/**
 * GuideRail — Light Glass Premium Header
 * ─────────────────────────────────────────────────────────────────────────────
 * 76px frosted tiffany-glass sovereign rail. Two precise zones:
 *   LEFT   — Wordmark "Sail AI" + active mode indicator
 *   RIGHT  — CTX toggle · BIZ toggle · Daily counter · History · Reset · Pro
 *
 * Palette: tiffany glass (60%) · white (20%) · gold (15%) · dark bubbles (5%)
 * Mode selection lives exclusively in ChatComposer's dropdown.
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { DailyCounter }            from '@/components/DailyCounter'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:          'rgba(8,9,13,0.72)',
  border:      'rgba(201,169,110,0.22)',
  glass:       'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(201,169,110,0.16)',
  teal:        '#81d8d0',
  tealDim:     'rgba(129,216,208,0.10)',
  tealBorder:  'rgba(129,216,208,0.25)',
  gold:        '#C9A96E',
  goldDim:     'rgba(201,169,110,0.10)',
  goldBorder:  'rgba(201,169,110,0.35)',
  textPrimary: '#E8EDF3',
  textMuted:   'rgba(232,237,243,0.52)',
  textFaint:   'rgba(232,237,243,0.30)',
} as const

const MODE_META: Record<AnalysisMode, { label: string; color: string; icon: string }> = {
  upwind:    { label: 'Upwind',    color: '#2563EB', icon: '◎' },
  downwind:  { label: 'Downwind',  color: '#059669', icon: '◉' },
  sail:      { label: 'SAIL',      color: '#7C3AED', icon: '◈' },
  trim:      { label: 'TRIM',      color: '#B45309', icon: '▤' },
  catamaran: { label: 'Catamaran', color: '#D97706', icon: '⊕' },
  operator:  { label: 'Operator',  color: '#DC2626', icon: '◆' },
  synergy:   { label: 'Synergy',   color: '#C9A96E', icon: '◬' },
  scenario:  { label: 'Scenario',  color: '#0891B2', icon: '◐' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GuideRailProps {
  mode:          AnalysisMode
  isActive:      boolean
  isPro:         boolean
  usedToday:     number
  useProfileCtx: boolean
  businessMode:  boolean
  hasHistory:    boolean
  hasMessages:   boolean
  contextLabel:  string
  onModeSelect:     (m: AnalysisMode) => void
  onToggleCtx:      () => void
  onToggleBusiness: () => void
  onHistory:        () => void
  onReset:          () => void
  onUpgradePro:     () => void
  hasApiKey?:       boolean
  onAddKey?:        () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GuideRail({
  mode, isActive, isPro, usedToday,
  useProfileCtx, businessMode, hasHistory, hasMessages, contextLabel,
  onModeSelect, onToggleCtx, onToggleBusiness, onHistory, onReset, onUpgradePro,
  hasApiKey = true, onAddKey,
}: GuideRailProps) {
  const activeMeta = MODE_META[mode]

  return (
    <div style={{
      height:              76,
      flexShrink:          0,
      display:             'flex',
      alignItems:          'center',
      padding:             '0 28px',
      background:          T.bg,
      backdropFilter:      'blur(40px)',
      WebkitBackdropFilter:'blur(40px)',
      borderBottom:        `1px solid ${T.border}`,
      position:            'relative',
      zIndex:               10,
    }}>

      {/* Teal-to-gold hairline */}
      <div style={{
        position:   'absolute',
        bottom:      0,
        left:       '6%',
        right:      '6%',
        height:      1,
        background: `linear-gradient(90deg, transparent, rgba(129,216,208,0.30), rgba(201,169,110,0.35), transparent)`,
        pointerEvents: 'none',
      }} />

      {/* ── LEFT: Wordmark + active mode indicator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:       20,
            fontWeight:     400,
            letterSpacing: '-0.02em',
            color:          T.textPrimary,
            lineHeight:     1,
          }}>
            Sail{' '}
            <span style={{
              color:      T.gold,
              fontWeight:  600,
              fontStyle:  'italic',
            }}>AI</span>
          </span>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       7,
            fontWeight:     700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:          T.textFaint,
            lineHeight:     1,
          }}>
            Sovereign Intelligence
          </span>
        </div>

        <div style={{ width: 1, height: 28, background: T.border }} />

        {/* Active mode indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.span
            animate={isActive
              ? { opacity: [1, 0.15, 1], scale: [1, 0.6, 1] }
              : { opacity: 0.8, scale: 1 }}
            transition={{ duration: 1.1, repeat: isActive ? Infinity : 0 }}
            style={{
              display:      'inline-block',
              width:         6,
              height:        6,
              borderRadius: '50%',
              background:    activeMeta.color,
              flexShrink:    0,
              boxShadow:     isActive ? `0 0 10px ${activeMeta.color}70` : 'none',
            }}
          />
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9.5,
            fontWeight:     700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:          activeMeta.color,
          }}>
            {activeMeta.label}
          </span>
          <AnimatePresence>
            {isActive && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize:    8.5,
                  color:       T.teal,
                  fontStyle:  'italic',
                  opacity:     0.7,
                }}
              >
                · live
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {contextLabel && (
          <>
            <div style={{ width: 1, height: 20, background: T.border }} />
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:       9.5,
              color:          T.textMuted,
              letterSpacing: '0.02em',
              maxWidth:       160,
              overflow:       'hidden',
              textOverflow:   'ellipsis',
              whiteSpace:     'nowrap',
            }}>
              {contextLabel}
            </span>
          </>
        )}
      </div>

      {/* ── RIGHT: Controls ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:             8,
        justifyContent: 'flex-end',
      }}>

        <ControlPill active={useProfileCtx} activeColor={T.teal} onClick={onToggleCtx}
          title={useProfileCtx ? 'Profile context on' : 'Profile context off'}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke={useProfileCtx ? T.teal : T.textMuted}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.10em',
            color: useProfileCtx ? T.teal : T.textMuted,
          }}>CTX</span>
        </ControlPill>

        <ControlPill active={businessMode} activeColor={T.teal} onClick={onToggleBusiness}
          title={businessMode ? 'Business mode' : 'Chat mode'}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>{businessMode ? '💼' : '💬'}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.10em',
            color: businessMode ? T.teal : T.textMuted,
          }}>
            {businessMode ? 'BIZ' : 'CHAT'}
          </span>
        </ControlPill>

        <div style={{ width: 1, height: 22, background: T.border }} />

        {hasHistory && (
          <IconButton onClick={onHistory} title="Session history">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </IconButton>
        )}

        {hasMessages && (
          <IconButton onClick={onReset} title="New topic">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </IconButton>
        )}

        <DailyCounter used={usedToday} isPro={isPro} />

        {/* API key badge */}
        <AnimatePresence>
          {!hasApiKey && onAddKey && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [1, 0.65, 1], scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              onClick={onAddKey}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Add your Groq API key to start chatting"
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:            5,
                padding:       '5px 11px',
                background:    'rgba(201,169,110,0.10)',
                border:        '1px solid rgba(201,169,110,0.38)',
                borderRadius:   9999,
                cursor:        'pointer',
                outline:       'none',
                fontFamily:    'Inter, sans-serif',
                fontSize:       9,
                fontWeight:     700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:         T.gold,
              }}
            >
              <span style={{ fontSize: 10 }}>🔑</span>
              Add Key
            </motion.button>
          )}
        </AnimatePresence>

        {isPro ? (
          <div style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9,
            fontWeight:     700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color:          T.gold,
            background:    T.goldDim,
            border:        `1px solid ${T.goldBorder}`,
            borderRadius:   5,
            padding:       '3px 8px',
          }}>
            PRO ✦
          </div>
        ) : (
          <motion.button
            onClick={onUpgradePro}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding:       '5px 13px',
              background:    T.tealDim,
              border:        `1px solid ${T.tealBorder}`,
              borderRadius:   9999,
              cursor:        'pointer',
              fontFamily:    'Inter, sans-serif',
              fontSize:       9,
              fontWeight:     700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:          T.teal,
              outline:       'none',
            }}
          >
            PRO ↑
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ControlPill({ active, activeColor, onClick, title, children }: {
  active: boolean
  activeColor: string
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      title={title}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:          4,
        padding:     '5px 10px',
        borderRadius: 9999,
        background:   active
          ? `linear-gradient(135deg, ${activeColor}18 0%, ${activeColor}08 100%)`
          : 'rgba(255,255,255,0.04)',
        border:      `1px solid ${active ? `${activeColor}40` : 'rgba(201,169,110,0.16)'}`,
        boxShadow:    active ? `0 0 10px ${activeColor}12` : 'none',
        cursor:       'pointer',
        transition:   'all 0.2s cubic-bezier(0.22,1,0.36,1)',
        outline:      'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </motion.button>
  )
}

function IconButton({ onClick, title, children }: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.93 }}
      title={title}
      style={{
        width:          32,
        height:         32,
        borderRadius:   8,
        background:     'rgba(255,255,255,0.04)',
        border:         '1px solid rgba(201,169,110,0.18)',
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:      0,
        transition:     'all 0.15s',
        outline:        'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </motion.button>
  )
}
