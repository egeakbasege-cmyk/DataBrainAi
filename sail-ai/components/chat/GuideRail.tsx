'use client'

/**
 * GuideRail — Dark Obsidian Executive Header
 * ─────────────────────────────────────────────────────────────────────────────
 * 80px dark-glass sovereign rail. Three precise zones:
 *   LEFT   — Wordmark "Sail AI" + active mode indicator
 *   CENTER — 3 primary mode quick-pills (Upwind / SAIL / TRIM)
 *   RIGHT  — CTX toggle · BIZ toggle · Daily counter · History · Reset
 *
 * Palette: obsidian (60%) · dark glass (25%) · gold (10%) · mint (5%)
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { AnalysisMode }       from '@/components/ModeSelector'
import { DailyCounter }            from '@/components/DailyCounter'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:          'rgba(8,11,18,0.96)',
  border:      'rgba(201,169,110,0.16)',
  glow:        'rgba(201,169,110,0.28)',
  glass:       'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.09)',
  glassMd:     'rgba(255,255,255,0.08)',
  teal:        '#14B8A6',
  tealDim:     'rgba(20,184,166,0.18)',
  tealBorder:  'rgba(20,184,166,0.30)',
  gold:        '#C9A96E',
  goldDim:     'rgba(201,169,110,0.12)',
  goldBorder:  'rgba(201,169,110,0.32)',
  textPrimary: '#E8EDF3',
  textMuted:   'rgba(232,237,243,0.42)',
  textFaint:   'rgba(232,237,243,0.22)',
} as const

const MODE_META: Record<AnalysisMode, { label: string; color: string; icon: string }> = {
  upwind:    { label: 'Upwind',    color: '#4F8EF7', icon: '◎' },
  downwind:  { label: 'Downwind',  color: '#34D399', icon: '◉' },
  sail:      { label: 'SAIL',      color: '#A78BFA', icon: '◈' },
  trim:      { label: 'TRIM',      color: '#FBA928', icon: '▤' },
  catamaran: { label: 'Catamaran', color: '#FBBF24', icon: '⊕' },
  operator:  { label: 'Operator',  color: '#F87171', icon: '◆' },
  synergy:   { label: 'Synergy',   color: '#C9A96E', icon: '◬' },
  scenario:  { label: 'Scenario',  color: '#38BDF8', icon: '◐' },
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
      backdropFilter:      'blur(48px)',
      WebkitBackdropFilter:'blur(48px)',
      borderBottom:        `1px solid ${T.border}`,
      position:            'relative',
      zIndex:               10,
    }}>

      {/* Gold gradient hairline */}
      <div style={{
        position:   'absolute',
        bottom:      0,
        left:       '6%',
        right:      '6%',
        height:      1,
        background: `linear-gradient(90deg, transparent, ${T.gold}55, ${T.teal}30, ${T.gold}55, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Subtle top edge highlight */}
      <div style={{
        position:   'absolute',
        top:         0,
        left:        0,
        right:       0,
        height:      1,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)`,
        pointerEvents: 'none',
      }} />

      {/* ── LEFT: Wordmark + active mode ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 200 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:       20,
            fontWeight:     300,
            letterSpacing: '-0.03em',
            color:         T.textPrimary,
            lineHeight:     1,
          }}>
            Sail{' '}
            <span style={{
              color: T.gold,
              fontWeight: 600,
              textShadow: `0 0 20px ${T.gold}60`,
            }}>AI</span>
          </span>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       7.5,
            fontWeight:     700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         T.textFaint,
            lineHeight:     1,
          }}>
            Sovereign Intelligence
          </span>
        </div>

        <div style={{ width: 1, height: 30, background: T.border }} />

        {/* Active mode indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.span
            animate={isActive
              ? { opacity: [1, 0.15, 1], scale: [1, 0.6, 1] }
              : { opacity: 0.75, scale: 1 }}
            transition={{ duration: 1.1, repeat: isActive ? Infinity : 0 }}
            style={{
              display:      'inline-block',
              width:         7,
              height:        7,
              borderRadius: '50%',
              background:    activeMeta.color,
              flexShrink:    0,
              boxShadow:     isActive ? `0 0 12px ${activeMeta.color}80` : 'none',
            }}
          />
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:       10,
            fontWeight:     700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:          activeMeta.color,
            textShadow:    `0 0 16px ${activeMeta.color}50`,
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
                  fontSize:    9,
                  color:      `${T.teal}80`,
                  fontStyle:  'italic',
                }}
              >
                · live
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CENTER: Primary mode quick-select ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:       8.5,
          fontWeight:     600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          T.textFaint,
          marginRight:    4,
        }}>
          Mode
        </span>
        {PRIMARY_MODES.map(m => {
          const meta   = MODE_META[m]
          const active = mode === m
          return (
            <motion.button
              key={m}
              onClick={() => onModeSelect(m)}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:         5,
                padding:    '6px 14px',
                borderRadius: 9999,
                background:  active
                  ? `linear-gradient(135deg, ${meta.color}18 0%, ${meta.color}10 100%)`
                  : T.glass,
                border:      `1px solid ${active ? `${meta.color}50` : T.glassBorder}`,
                boxShadow:   active ? `0 0 16px ${meta.color}20, inset 0 1px 0 rgba(255,255,255,0.06)` : 'none',
                backdropFilter: 'blur(12px)',
                cursor:      'pointer',
                transition:  'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                outline:     'none',
              }}
            >
              <span style={{
                fontSize:  11,
                color:     active ? meta.color : T.textFaint,
                lineHeight: 1,
                textShadow: active ? `0 0 12px ${meta.color}60` : 'none',
              }}>
                {meta.icon}
              </span>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:       9.5,
                fontWeight:     active ? 700 : 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:          active ? meta.color : T.textMuted,
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
              fontFamily:    'Inter, sans-serif',
              fontSize:       10,
              color:          T.textMuted,
              letterSpacing: '0.02em',
              maxWidth:       140,
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
        display:         'flex',
        alignItems:      'center',
        gap:              8,
        minWidth:         220,
        justifyContent:  'flex-end',
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
                background:    'rgba(251,186,0,0.10)',
                border:        '1px solid rgba(251,186,0,0.40)',
                borderRadius:   9999,
                cursor:        'pointer',
                outline:       'none',
                fontFamily:    'Inter, sans-serif',
                fontSize:       9,
                fontWeight:     700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:         '#FBB700',
                boxShadow:     '0 0 16px rgba(251,186,0,0.12)',
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
            background:    `linear-gradient(135deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.08) 100%)`,
            border:        `1px solid ${T.goldBorder}`,
            borderRadius:   5,
            padding:       '3px 8px',
            boxShadow:     `0 0 14px rgba(201,169,110,0.14)`,
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
              background:    `linear-gradient(135deg, ${T.tealDim} 0%, rgba(20,184,166,0.08) 100%)`,
              border:        `1px solid ${T.tealBorder}`,
              borderRadius:   9999,
              cursor:        'pointer',
              fontFamily:    'Inter, sans-serif',
              fontSize:       9,
              fontWeight:     700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:          T.teal,
              boxShadow:     `0 0 14px rgba(20,184,166,0.12)`,
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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={title}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:             4,
        padding:        '5px 10px',
        borderRadius:    9999,
        background:      active
          ? `linear-gradient(135deg, ${activeColor}18 0%, ${activeColor}0C 100%)`
          : 'rgba(255,255,255,0.05)',
        border:         `1px solid ${active ? `${activeColor}40` : 'rgba(255,255,255,0.09)'}`,
        boxShadow:       active ? `0 0 12px ${activeColor}18` : 'none',
        cursor:          'pointer',
        transition:      'all 0.2s cubic-bezier(0.22,1,0.36,1)',
        outline:         'none',
        backdropFilter:  'blur(12px)',
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
      whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.10)' }}
      whileTap={{ scale: 0.93 }}
      title={title}
      style={{
        width:           32,
        height:          32,
        borderRadius:    8,
        background:      'rgba(255,255,255,0.05)',
        border:          '1px solid rgba(255,255,255,0.09)',
        cursor:          'pointer',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:       0,
        transition:      'all 0.15s',
        outline:         'none',
        backdropFilter:  'blur(12px)',
      }}
    >
      {children}
    </motion.button>
  )
}
