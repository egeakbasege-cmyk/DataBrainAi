'use client'

/**
 * GuideRail — Mint Glass Executive Header
 * ─────────────────────────────────────────────────────────────────────────────
 * 80px frosted mint-glass rail. Three precise zones:
 *   LEFT   — Wordmark "Sail AI" + active mode indicator
 *   CENTER — 3 primary mode quick-pills (Upwind / SAIL / TRIM)
 *   RIGHT  — CTX toggle · BIZ toggle · Daily counter · History · Reset
 *
 * Palette: mint/tiffany glass (50%) · white (15%) · gold (15%) · charcoal text
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { DailyCounter }            from '@/components/DailyCounter'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:          'rgba(248,253,251,0.93)',
  border:      'rgba(129,199,185,0.30)',
  glass:       'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(129,199,185,0.24)',
  teal:        '#14B8A6',
  tiffany:     '#0D9488',
  gold:        '#C9A96E',
  goldBorder:  'rgba(201,169,110,0.38)',
  textPrimary: '#1A2B3C',
  textMuted:   'rgba(26,43,60,0.42)',
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
  // API key
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
      height:              80,
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
      {/* Gold gradient hairline */}
      <div style={{
        position:   'absolute',
        bottom:      0,
        left:       '8%',
        right:      '8%',
        height:      1,
        background: `linear-gradient(90deg, transparent, ${T.gold}45, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* ── LEFT: Wordmark + active mode ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 190 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:       19,
            fontWeight:     300,
            letterSpacing: '-0.03em',
            color:         T.textPrimary,
            lineHeight:     1,
          }}>
            Sail <span style={{ color: T.gold, fontWeight: 600 }}>AI</span>
          </span>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       8,
            fontWeight:     700,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color:         T.textMuted,
            lineHeight:     1,
          }}>
            Strategic Intelligence
          </span>
        </div>

        <div style={{ width: 1, height: 28, background: T.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.span
            animate={isActive
              ? { opacity: [1, 0.2, 1], scale: [1, 0.65, 1] }
              : { opacity: 0.7, scale: 1 }}
            transition={{ duration: 1.1, repeat: isActive ? Infinity : 0 }}
            style={{
              display: 'inline-block', width: 7, height: 7,
              borderRadius: '50%', background: activeMeta.color, flexShrink: 0,
              boxShadow: isActive ? `0 0 10px ${activeMeta.color}70` : 'none',
            }}
          />
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: activeMeta.color,
          }}>
            {activeMeta.label}
          </span>
          <AnimatePresence>
            {isActive && (
              <motion.span
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: `${T.teal}90`, fontStyle: 'italic' }}
              >
                · active
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CENTER: Primary mode quick-select ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textMuted, marginRight: 6,
        }}>
          Mode
        </span>
        {PRIMARY_MODES.map(m => {
          const meta   = MODE_META[m]
          const active = mode === m
          return (
            <motion.button
              key={m} onClick={() => onModeSelect(m)}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
                borderRadius: 9999,
                background: active ? `${meta.color}14` : T.glass,
                border: `1px solid ${active ? `${meta.color}45` : T.glassBorder}`,
                backdropFilter: 'blur(12px)',
                cursor: 'pointer', transition: 'all 0.18s', outline: 'none',
              }}
            >
              <span style={{ fontSize: 11, color: active ? meta.color : T.textMuted, lineHeight: 1 }}>{meta.icon}</span>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: 10,
                fontWeight: active ? 700 : 500, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: active ? meta.color : T.textMuted,
              }}>
                {meta.label}
              </span>
            </motion.button>
          )
        })}
        {contextLabel && (
          <>
            <div style={{ width: 1, height: 20, background: T.border, margin: '0 6px' }} />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 10, color: T.textMuted,
              letterSpacing: '0.02em', maxWidth: 140, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {contextLabel}
            </span>
          </>
        )}
      </div>

      {/* ── RIGHT: Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 210, justifyContent: 'flex-end' }}>
        <ControlPill active={useProfileCtx} activeColor={T.teal} onClick={onToggleCtx}
          title={useProfileCtx ? 'Profile context on' : 'Profile context off'}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
            stroke={useProfileCtx ? T.teal : T.textMuted}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: useProfileCtx ? T.teal : T.textMuted }}>CTX</span>
        </ControlPill>

        <ControlPill active={businessMode} activeColor={T.teal} onClick={onToggleBusiness}
          title={businessMode ? 'Business mode' : 'Chat mode'}>
          <span style={{ fontSize: 9, lineHeight: 1 }}>{businessMode ? '💼' : '💬'}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: businessMode ? T.teal : T.textMuted }}>
            {businessMode ? 'BIZ' : 'CHAT'}
          </span>
        </ControlPill>

        <div style={{ width: 1, height: 20, background: T.border }} />

        {hasHistory && (
          <IconButton onClick={onHistory} title="Session history">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </IconButton>
        )}

        {hasMessages && (
          <IconButton onClick={onReset} title="New topic">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={T.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </IconButton>
        )}

        <DailyCounter used={usedToday} isPro={isPro} />

        {/* API key badge — shown when no key is configured */}
        {!hasApiKey && onAddKey && (
          <motion.button
            onClick={onAddKey}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            title="Add your Groq API key to start chatting"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.45)',
              borderRadius: 9999, cursor: 'pointer', outline: 'none',
              fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CA8A04',
            }}
          >
            <span style={{ fontSize: 10 }}>🔑</span>
            Add API Key
          </motion.button>
        )}

        {isPro ? (
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: T.gold, background: 'rgba(201,169,110,0.12)',
            border: `1px solid ${T.goldBorder}`, borderRadius: 4, padding: '3px 7px',
          }}>PRO</span>
        ) : (
          <motion.button onClick={onUpgradePro} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{
            padding: '5px 12px',
            background: 'linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(13,148,136,0.18) 100%)',
            border: `1px solid ${T.teal}50`, borderRadius: 9999, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: T.tiffany,
          }}>PRO ↑</motion.button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ControlPill({ active, activeColor, onClick, title, children }: {
  active: boolean; activeColor: string; onClick: () => void
  title: string; children: React.ReactNode
}) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
        borderRadius: 9999,
        background: active ? `${activeColor}12` : 'rgba(255,255,255,0.58)',
        border: `1px solid ${active ? `${activeColor}35` : 'rgba(129,199,185,0.22)'}`,
        cursor: 'pointer', transition: 'all 0.18s', outline: 'none',
        backdropFilter: 'blur(12px)',
      }}
    >{children}</motion.button>
  )
}

function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ scale: 1.06, background: 'rgba(255,255,255,0.85)' }}
      whileTap={{ scale: 0.94 }} title={title}
      style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(255,255,255,0.58)',
        border: '1px solid rgba(129,199,185,0.22)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s', outline: 'none',
        backdropFilter: 'blur(12px)',
      }}
    >{children}</motion.button>
  )
}
