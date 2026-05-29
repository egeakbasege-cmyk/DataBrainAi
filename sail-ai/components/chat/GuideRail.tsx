'use client'

/**
 * GuideRail — Restored Top Guide Section
 * ─────────────────────────────────────────────────────────────────────────────
 * 80px dark glass rail directly below Nav.
 * Three precise zones:
 *   LEFT   — Wordmark "SAIL AI" + active mode indicator
 *   CENTER — 3 primary mode quick-pills (Upwind / SAIL / TRIM)
 *   RIGHT  — CTX toggle · BIZ toggle · Daily counter · History · Reset
 *
 * One gold hairline at the bottom. Zero additional borders.
 * Dark exclusive palette: #0A0D14 substrate, rgba glass surfaces.
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { DailyCounter }            from '@/components/DailyCounter'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:         'rgba(10,13,20,0.96)',
  glass:      'rgba(255,255,255,0.04)',
  border:     'rgba(255,255,255,0.07)',
  textPrimary:'#E8EDF3',
  textMuted:  'rgba(232,237,243,0.38)',
  teal:       '#14B8A6',
  gold:       '#C9A96E',
} as const

const MODE_META: Record<AnalysisMode, { label: string; color: string; icon: string }> = {
  upwind:    { label: 'Upwind',    color: '#3B82F6', icon: '◎' },
  downwind:  { label: 'Downwind',  color: '#10B981', icon: '◉' },
  sail:      { label: 'SAIL',      color: '#8B5CF6', icon: '◈' },
  trim:      { label: 'TRIM',      color: '#F59E0B', icon: '▤' },
  catamaran: { label: 'Catamaran', color: '#EAB308', icon: '⊕' },
  operator:  { label: 'Operator',  color: '#EF4444', icon: '◆' },
  synergy:   { label: 'Synergy',   color: '#C9A96E', icon: '◬' },
  scenario:  { label: 'Scenario',  color: '#06B6D4', icon: '◐' },
}

// Primary trio always shown in center
const PRIMARY_MODES: AnalysisMode[] = ['upwind', 'sail', 'trim']

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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GuideRail({
  mode, isActive, isPro, usedToday,
  useProfileCtx, businessMode, hasHistory, hasMessages, contextLabel,
  onModeSelect, onToggleCtx, onToggleBusiness, onHistory, onReset, onUpgradePro,
}: GuideRailProps) {
  const activeMeta = MODE_META[mode]

  return (
    <div
      style={{
        height:              80,
        flexShrink:          0,
        display:             'flex',
        alignItems:          'center',
        gap:                  0,
        padding:             '0 28px',
        background:          T.bg,
        backdropFilter:      'blur(40px)',
        WebkitBackdropFilter:'blur(40px)',
        position:            'relative',
        zIndex:               10,
      }}
    >
      {/* Bottom gold rule */}
      <div style={{
        position:   'absolute',
        bottom:      0,
        left:       '8%',
        right:      '8%',
        height:      1,
        background: `linear-gradient(90deg, transparent, ${T.gold}30, transparent)`,
      }} />

      {/* ── LEFT: Wordmark + active mode ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 180 }}>
        {/* Logotype */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:       18,
            fontWeight:     300,
            letterSpacing: '-0.03em',
            color:         T.textPrimary,
            lineHeight:     1,
          }}>
            Sail <span style={{ color: T.gold, fontWeight: 600 }}>AI</span>
          </span>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9,
            fontWeight:     600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color:         T.textMuted,
            lineHeight:     1,
          }}>
            Strategic Intelligence
          </span>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: T.border }} />

        {/* Active mode pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.span
            animate={isActive
              ? { opacity: [1, 0.2, 1], scale: [1, 0.65, 1] }
              : { opacity: 0.6, scale: 1 }}
            transition={{ duration: 1.1, repeat: isActive ? Infinity : 0 }}
            style={{
              display:      'inline-block',
              width:         7,
              height:        7,
              borderRadius: '50%',
              background:   activeMeta.color,
              flexShrink:   0,
              boxShadow:    isActive ? `0 0 10px ${activeMeta.color}90` : 'none',
            }}
          />
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       10,
            fontWeight:     700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         activeMeta.color,
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
                  fontFamily:  'Inter, sans-serif',
                  fontSize:     9,
                  color:       `${T.teal}90`,
                  fontStyle:   'italic',
                }}
              >
                · active
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CENTER: Primary mode quick-select ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {/* Guide label */}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       9,
          fontWeight:     600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         T.textMuted,
          marginRight:    8,
        }}>
          Select mode
        </span>

        {PRIMARY_MODES.map(m => {
          const meta   = MODE_META[m]
          const active = mode === m
          return (
            <motion.button
              key={m}
              onClick={() => onModeSelect(m)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:            5,
                padding:       '6px 14px',
                borderRadius:  9999,
                background:    active ? `${meta.color}18` : 'rgba(255,255,255,0.04)',
                border:        `1px solid ${active ? `${meta.color}50` : 'rgba(255,255,255,0.07)'}`,
                cursor:        'pointer',
                transition:    'all 0.18s',
                outline:       'none',
              }}
            >
              <span style={{ fontSize: 11, color: active ? meta.color : T.textMuted, lineHeight: 1 }}>
                {meta.icon}
              </span>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:       10,
                fontWeight:     active ? 700 : 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:          active ? meta.color : T.textMuted,
              }}>
                {meta.label}
              </span>
            </motion.button>
          )
        })}

        {/* Context label (if set) */}
        {contextLabel && (
          <>
            <div style={{ width: 1, height: 20, background: T.border, margin: '0 8px' }} />
            <span style={{
              fontFamily:  'Inter, sans-serif',
              fontSize:     10,
              color:       T.textMuted,
              letterSpacing:'0.02em',
              maxWidth:    160,
              overflow:    'hidden',
              textOverflow:'ellipsis',
              whiteSpace:  'nowrap',
            }}>
              {contextLabel}
            </span>
          </>
        )}
      </div>

      {/* ── RIGHT: Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, justifyContent: 'flex-end' }}>

        {/* CTX toggle */}
        <ControlPill
          active={useProfileCtx}
          activeColor="#10B981"
          onClick={onToggleCtx}
          title={useProfileCtx ? 'Profile context on' : 'Profile context off'}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke={useProfileCtx ? '#10B981' : T.textMuted}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: useProfileCtx ? '#10B981' : T.textMuted }}>
            CTX
          </span>
        </ControlPill>

        {/* BIZ toggle */}
        <ControlPill
          active={businessMode}
          activeColor="#10B981"
          onClick={onToggleBusiness}
          title={businessMode ? 'Business mode' : 'Chat mode'}
        >
          <span style={{ fontSize: 9, lineHeight: 1 }}>{businessMode ? '💼' : '💬'}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: businessMode ? '#10B981' : T.textMuted }}>
            {businessMode ? 'BIZ' : 'CHAT'}
          </span>
        </ControlPill>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: T.border }} />

        {/* History */}
        {hasHistory && (
          <IconButton onClick={onHistory} title="Session history">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </IconButton>
        )}

        {/* Reset */}
        {hasMessages && (
          <IconButton onClick={onReset} title="New topic">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </IconButton>
        )}

        {/* Counter */}
        <DailyCounter used={usedToday} isPro={isPro} />

        {/* Pro badge / upgrade */}
        {isPro ? (
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       9,
            fontWeight:     700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         T.gold,
            background:    'rgba(201,169,110,0.1)',
            border:        `1px solid rgba(201,169,110,0.25)`,
            borderRadius:   4,
            padding:       '3px 7px',
          }}>
            PRO
          </span>
        ) : (
          <motion.button
            onClick={onUpgradePro}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding:       '5px 12px',
              background:    'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
              border:        '1px solid rgba(16,185,129,0.4)',
              borderRadius:  9999,
              cursor:        'pointer',
              fontFamily:    'Inter, sans-serif',
              fontSize:       9,
              fontWeight:     700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         '#6EE7B7',
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
      whileTap={{ scale: 0.96 }}
      title={title}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:         4,
        padding:   '5px 10px',
        borderRadius: 9999,
        background:  active ? `${activeColor}12` : 'rgba(255,255,255,0.04)',
        border:      `1px solid ${active ? `${activeColor}35` : 'rgba(255,255,255,0.07)'}`,
        cursor:      'pointer',
        transition:  'all 0.18s',
        outline:     'none',
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
      whileHover={{ scale: 1.06, background: 'rgba(255,255,255,0.07)' }}
      whileTap={{ scale: 0.94 }}
      title={title}
      style={{
        width:          32,
        height:         32,
        borderRadius:    8,
        background:     'rgba(255,255,255,0.04)',
        border:         '1px solid rgba(255,255,255,0.07)',
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
        transition:     'all 0.15s',
        outline:        'none',
      }}
    >
      {children}
    </motion.button>
  )
}
